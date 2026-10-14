"use server";

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import {
  completeChatWorkflow,
  parseJsonObject,
  refineCampaignEmailJson,
} from "@/lib/llm";
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

function buildUserMessage(input: GenerateComposeEmailInput): string {
  const parts: string[] = [];
  const action = input.action ?? "draft";
  parts.push(composeActionInstruction(action));

  if (input.to?.trim()) parts.push(`To: ${input.to.trim()}`);
  if (input.subject?.trim()) parts.push(`Current subject: ${input.subject.trim()}`);
  if (input.threadFrom?.trim()) parts.push(`Replying to: ${input.threadFrom.trim()}`);
  if (input.threadSubject?.trim()) parts.push(`Thread subject: ${input.threadSubject.trim()}`);
  if (input.threadBodySnippet?.trim()) {
    parts.push(`Thread excerpt:\n${input.threadBodySnippet.trim().slice(0, 4000)}`);
  }
  if (input.existingBodyPlain?.trim() && action !== "draft") {
    parts.push(`Current draft:\n${input.existingBodyPlain.trim().slice(0, 8000)}`);
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

  if (!prompt && action === "draft") {
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
    const userMessage = buildUserMessage({
      ...input,
      prompt: prompt || (action === "improve" ? "Improve this draft." : "Apply the requested tone change."),
    });

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

    let jsonText = content;
    const refined = await refineCampaignEmailJson({
      userId: user.id,
      draftJson: content,
      userPrompt: userMessage,
      force: modeConfig.refineJson,
    });
    if (refined) jsonText = refined;

    let parsed: { subject?: string; html?: string };
    try {
      parsed = parseJsonObject<{ subject: string; html: string }>(jsonText);
    } catch {
      return {
        ok: false,
        error: `AI returned invalid JSON (${provider}, ${mode}). Try Good quality or another provider key.`,
      };
    }

    let html = (parsed.html ?? "").trim();
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
