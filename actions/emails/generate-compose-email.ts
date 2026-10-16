"use server";

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { completeChatWorkflow } from "@/lib/llm";
import { parseCampaignEmailJson } from "@/lib/llm/parse-content";
import {
  composeActionInstruction,
  mailboxComposeSystemPrompt,
  parseQualityMode,
  QUALITY_MODE_CONFIG,
  type AiQualityMode,
  type ComposeAiAction,
  type MailboxComposeMode,
} from "@/lib/llm/quality-modes";
import { getConfiguredLlmProviders } from "@/lib/llm/availability";

export type GenerateComposeEmailInput = {
  prompt: string;
  mode?: MailboxComposeMode;
  action?: ComposeAiAction;
  qualityMode?: AiQualityMode;
  to?: string;
  subject?: string;
  existingBodyPlain?: string;
  threadFrom?: string;
  threadSubject?: string;
  threadBodySnippet?: string;
};

export type GenerateComposeEmailResult =
  | { ok: true; subject: string; html: string }
  | { ok: false; error: string };

const MAX_HTML = 120_000;

interface CrmEnrichedContext {
  recipientName?: string;
  recipientCompany?: string;
  recipientTitle?: string;
  accountType?: string;
  accountStatus?: string;
  opportunitySummary?: string;
  senderName?: string;
  senderTitle?: string;
  senderCompany?: string;
}

/** Safely resolve existing CRM context for recipient and logged-in sender. */
async function resolveCrmContext(
  toEmail?: string,
  userId?: string
): Promise<CrmEnrichedContext> {
  const context: CrmEnrichedContext = {
    senderName: "Akhil Kumar",
    senderCompany: "VenSai Labs",
  };

  // 1. Resolve Sender Identity
  if (userId) {
    try {
      const [userRow, mailbox] = await Promise.all([
        prismadb.users.findUnique({
          where: { id: userId },
          select: { name: true, account_name: true, role: true },
        }),
        prismadb.emailAccount.findFirst({
          where: { userId, isActive: true },
          select: { fromName: true, label: true },
        }),
      ]);

      context.senderName = mailbox?.fromName?.trim() || userRow?.name?.trim() || "Akhil Kumar";
      context.senderCompany = userRow?.account_name?.trim() || "VenSai Labs";
      if (userRow?.role && userRow.role !== "user") {
        context.senderTitle =
          userRow.role.charAt(0).toUpperCase() + userRow.role.slice(1);
      }
    } catch (e) {
      console.warn("[generate-compose-email] Could not resolve sender profile:", e);
    }
  }

  // 2. Resolve Recipient Context from CRM
  const rawEmail = toEmail?.split(",")[0]?.trim();
  if (rawEmail && rawEmail.includes("@")) {
    try {
      // Check crm_Contacts first
      const contact = await prismadb.crm_Contacts.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { email: { equals: rawEmail, mode: "insensitive" } },
            { personal_email: { equals: rawEmail, mode: "insensitive" } },
          ],
        },
        select: {
          first_name: true,
          last_name: true,
          position: true,
          assigned_accounts: {
            select: {
              name: true,
              type: true,
              status: true,
            },
          },
          opportunities: {
            take: 1,
            select: {
              opportunity: {
                select: { name: true },
              },
            },
          },
        },
      });

      if (contact) {
        const fullName = [contact.first_name, contact.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (fullName) context.recipientName = fullName;
        if (contact.position) context.recipientTitle = contact.position;
        if (contact.assigned_accounts?.name) {
          context.recipientCompany = contact.assigned_accounts.name;
          if (contact.assigned_accounts.type) {
            context.accountType = contact.assigned_accounts.type;
          }
          if (contact.assigned_accounts.status) {
            context.accountStatus = contact.assigned_accounts.status;
          }
        }
        if (contact.opportunities?.[0]?.opportunity?.name) {
          context.opportunitySummary = contact.opportunities[0].opportunity.name;
        }
      } else {
        // Fallback to crm_Leads
        const lead = await prismadb.crm_Leads.findFirst({
          where: {
            deletedAt: null,
            email: { equals: rawEmail, mode: "insensitive" },
          },
          select: {
            firstName: true,
            lastName: true,
            company: true,
            jobTitle: true,
            lead_status: { select: { name: true } },
            assigned_accounts: {
              select: {
                name: true,
                type: true,
                status: true,
              },
            },
          },
        });

        if (lead) {
          const fullName = [lead.firstName, lead.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          if (fullName) context.recipientName = fullName;
          if (lead.jobTitle) context.recipientTitle = lead.jobTitle;
          if (lead.company || lead.assigned_accounts?.name) {
            context.recipientCompany =
              lead.company || lead.assigned_accounts?.name || undefined;
          }
          if (lead.lead_status?.name) {
            context.accountStatus = `Lead (${lead.lead_status.name})`;
          }
        }
      }
    } catch (e) {
      console.warn("[generate-compose-email] Could not resolve recipient CRM context:", e);
    }
  }

  return context;
}

function buildUserMessage(
  input: GenerateComposeEmailInput,
  crm: CrmEnrichedContext
): string {
  const parts: string[] = [];
  const action = input.action ?? "draft";
  parts.push(composeActionInstruction(action));

  // Sender grounding
  const senderParts: string[] = [];
  if (crm.senderName) senderParts.push(`Name: ${crm.senderName}`);
  if (crm.senderTitle) senderParts.push(`Title: ${crm.senderTitle}`);
  if (crm.senderCompany) senderParts.push(`Company: ${crm.senderCompany}`);
  if (senderParts.length > 0) {
    parts.push(`[SENDER INFORMATION]\n${senderParts.join("\n")}`);
  }

  // Recipient & Relationship grounding
  const recipientParts: string[] = [];
  if (input.to?.trim()) recipientParts.push(`Email: ${input.to.trim()}`);
  if (crm.recipientName) recipientParts.push(`Name: ${crm.recipientName}`);
  if (crm.recipientTitle) recipientParts.push(`Title: ${crm.recipientTitle}`);
  if (crm.recipientCompany) recipientParts.push(`Company: ${crm.recipientCompany}`);
  if (crm.accountType || crm.accountStatus) {
    const rel = [crm.accountType, crm.accountStatus].filter(Boolean).join(", ");
    recipientParts.push(`Relationship status: ${rel}`);
  }
  if (crm.opportunitySummary) {
    recipientParts.push(`Active opportunity: ${crm.opportunitySummary}`);
  }
  if (recipientParts.length > 0) {
    parts.push(`[RECIPIENT & CRM CONTEXT]\n${recipientParts.join("\n")}`);
  }

  if (input.subject?.trim()) parts.push(`Current subject: ${input.subject.trim()}`);
  if (input.threadFrom?.trim()) parts.push(`Replying to: ${input.threadFrom.trim()}`);
  if (input.threadSubject?.trim()) parts.push(`Thread subject: ${input.threadSubject.trim()}`);
  if (input.threadBodySnippet?.trim()) {
    parts.push(`Thread excerpt:\n${input.threadBodySnippet.trim().slice(0, 4000)}`);
  }

  // Preserve existing editor draft
  if (input.existingBodyPlain?.trim()) {
    if (action === "draft") {
      parts.push(
        `[EXISTING DRAFT IN EDITOR]\n${input.existingBodyPlain.trim().slice(0, 8000)}\n(Note: The user already has this content in the editor. Incorporate their instructions while strictly preserving the key facts and intent of their existing draft. Do not discard what they already wrote.)`
      );
    } else {
      parts.push(`Current draft:\n${input.existingBodyPlain.trim().slice(0, 8000)}`);
    }
  }

  parts.push(`User instructions:\n${input.prompt.trim()}`);
  return parts.join("\n\n");
}

export async function generateComposeEmail(
  input: GenerateComposeEmailInput
): Promise<GenerateComposeEmailResult> {
  const prompt = input.prompt?.trim();
  const hasExisting = Boolean(input.existingBodyPlain?.trim());
  const action = input.action ?? "draft";

  if (!prompt && action === "draft" && !hasExisting) {
    return { ok: false, error: "Describe what you want to write." };
  }
  if (!prompt && !hasExisting && action !== "draft") {
    return { ok: false, error: "Add a draft or instructions first." };
  }

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { ok: false, error: "Unauthorized — sign in again." };
    }
    return { ok: false, error: "Could not verify your session." };
  }

  try {
    const mode = parseQualityMode(input.qualityMode);
    const modeConfig = QUALITY_MODE_CONFIG[mode];
    const composeMode = input.mode ?? "new";

    // 1. Resolve CRM context server-side
    const crmContext = await resolveCrmContext(input.to, user.id);

    // 2. Build enriched user message
    const userMessage = buildUserMessage(
      {
        ...input,
        prompt:
          prompt ||
          (action === "improve"
            ? "Improve this draft."
            : "Apply the requested tone change."),
      },
      crmContext
    );

    // 3. Dispatch to workflow (isolated 1-to-1 CRM email pipeline)
    const { content, provider, stages } = await completeChatWorkflow({
      task: "quick-copy",
      userId: user.id,
      userBrief: prompt || action,
      mode,
      messages: [
        {
          role: "system",
          content: mailboxComposeSystemPrompt(modeConfig.htmlStyle, composeMode),
        },
        { role: "user", content: userMessage },
      ],
    });

    if (stages.length > 0) {
      console.info("[generate-compose-email]", stages.join(" → "));
    }

    // 4. Parse JSON output safely
    let parsed: { subject: string; html: string };
    try {
      parsed = parseCampaignEmailJson(content, prompt || "Email");
    } catch {
      return {
        ok: false,
        error: `AI returned unusable output (${provider}, ${mode}). Try Good quality or another provider key.`,
      };
    }

    let html = parsed.html.trim();
    if (!html) {
      return { ok: false, error: "AI returned empty content. Try a clearer prompt." };
    }
    if (html.length > MAX_HTML) html = html.slice(0, MAX_HTML);

    const subject =
      parsed.subject?.trim() ||
      (composeMode === "new" ? input.subject?.trim() ?? "" : "");

    return { ok: true, subject, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-compose-email]", msg, e);
    if (/No LLM available/i.test(msg)) {
      const configured = await getConfiguredLlmProviders(user.id);
      const attemptsMatch = msg.match(/Attempts:\s*(.+)$/i);
      const attempts = attemptsMatch?.[1]?.trim();
      if (configured.length === 0) {
        return {
          ok: false,
          error:
            "No AI keys found. Add OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY on Vercel, then redeploy.",
        };
      }
      return {
        ok: false,
        error: attempts
          ? `AI failed (${configured.join(", ")}). ${attempts}`
          : `AI failed with keys set (${configured.join(", ")}). Try Quality: Good.`,
      };
    }
    return { ok: false, error: msg || "AI generation failed." };
  }
}
