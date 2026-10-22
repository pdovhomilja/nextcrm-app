"use server";

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { getTeamDirectory } from "@/actions/team/get-team-directory";
import { completeChat } from "@/lib/llm";
import { describeImageWithGemini } from "@/lib/llm/chat-vision";
import {
  buildChatDmQuery,
  buildEmailsComposeQuery,
  interpretAssistantCommand,
} from "@/lib/assistant/interpret-command";
import {
  appendMemoriesToSystem,
  recallMemoriesForPrompt,
  rememberConversationTurn,
} from "@/lib/mem0/crm-memory";

export type AssistantAction =
  | { type: "reply"; message: string }
  | { type: "open_compose"; emailsQuery: string; summary: string }
  | { type: "open_chat"; summary: string }
  | { type: "open_chat_dm"; chatQuery: string; summary: string }
  | { type: "navigate"; path: string; summary: string };

function systemPrompt(pageContext?: string): string {
  const ctx = pageContext?.trim()
    ? `\nUser is currently on: ${pageContext.trim()}. Prefer actions relevant to this page.`
    : "";
  return `You are VenSai CRM Assistant. Help with CRM, email, projects, schedule, and team chat.${ctx}

Commands you can trigger for the user (they can type these literally):
- "Send a proposal email to name@company.com" → opens compose with AI draft
- "Message Jayandra about the demo" → opens team DM with draft text
- "Open emails" / "Open projects" / "Open schedule"
- Upload an image to analyze requirements (screenshots, briefs)

You cannot send email or post chat yourself. Keep replies under 120 words unless asked for detail.`;
}

export async function handleAssistantMessage(input: {
  message: string;
  pageContext?: string;
}): Promise<{ ok: true; action: AssistantAction } | { ok: false; error: string }> {
  const text = input.message?.trim();
  if (!text) return { ok: false, error: "Type a message first." };

  let userId: string;
  try {
    const user = await requireAuthenticated();
    userId = user.id;
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { ok: false, error: "Sign in to use the assistant." };
    }
    return { ok: false, error: "Could not verify session." };
  }

  const team = await getTeamDirectory();
  const intent = interpretAssistantCommand(text, { team, currentUserId: userId });

  if (intent.kind === "compose_email") {
    const emailsQuery = buildEmailsComposeQuery({
      to: intent.to,
      prompt: intent.prompt,
      autoGenerate: true,
    });
    return {
      ok: true,
      action: {
        type: "open_compose",
        emailsQuery,
        summary: `Opening compose to ${intent.to} with an AI draft. Review and click Send when ready.`,
      },
    };
  }

  if (intent.kind === "open_chat_dm") {
    const chatQuery = buildChatDmQuery({ userId: intent.userId, draft: intent.draft });
    return {
      ok: true,
      action: {
        type: "open_chat_dm",
        chatQuery,
        summary: intent.draft
          ? `Opening chat with ${intent.peerName}. Your message is in the composer — edit and send.`
          : `Opening chat with ${intent.peerName}.`,
      },
    };
  }

  if (intent.kind === "open_chat") {
    return {
      ok: true,
      action: {
        type: "open_chat",
        summary: "Opening team chat.",
      },
    };
  }

  if (intent.kind === "navigate") {
    return {
      ok: true,
      action: {
        type: "navigate",
        path: intent.path,
        summary: `Opening ${intent.label}.`,
      },
    };
  }

  try {
    const memories = await recallMemoriesForPrompt({
      userId,
      query: text,
      surface: "assistant",
    });
    const result = await completeChat({
      task: "quick-copy",
      userId,
      messages: [
        {
          role: "system",
          content: appendMemoriesToSystem(systemPrompt(input.pageContext), memories),
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
      timeoutMs: 45_000,
    });
    void rememberConversationTurn({
      userId,
      surface: "assistant",
      userText: text,
      assistantText: result.content,
    });
    return {
      ok: true,
      action: { type: "reply", message: result.content },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assistant unavailable";
    return {
      ok: true,
      action: {
        type: "reply",
        message: `I couldn't reach the AI providers (${msg}). Try: "Send a proposal email to you@example.com" or "Message [teammate name] about …".`,
      },
    };
  }
}

/** Analyze screenshot/brief; optionally chain into compose if an email is mentioned. */
export async function handleAssistantImage(input: {
  imageDataUrl: string;
  userNote?: string;
  pageContext?: string;
}): Promise<{ ok: true; action: AssistantAction } | { ok: false; error: string }> {
  if (!input.imageDataUrl?.startsWith("data:image/")) {
    return { ok: false, error: "Upload a JPEG or PNG image." };
  }
  if (input.imageDataUrl.length > 4_500_000) {
    return { ok: false, error: "Image is too large. Use a screenshot under ~2 MB." };
  }

  let userId: string;
  try {
    const user = await requireAuthenticated();
    userId = user.id;
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { ok: false, error: "Sign in to use the assistant." };
    }
    return { ok: false, error: "Could not verify session." };
  }

  const prompt = `You are a CRM assistant. Describe this image for a business user: requirements, text you can read, suggested CRM actions (email, task, lead).${
    input.userNote?.trim() ? `\nUser note: ${input.userNote.trim()}` : ""
  }${input.pageContext?.trim() ? `\nPage context: ${input.pageContext.trim()}` : ""}
If you see an email address and the user likely wants outreach, end with a line exactly like:
COMPOSE: email@example.com | one-line instruction for the email draft`;

  try {
    const analysis = await describeImageWithGemini({
      imageDataUrl: input.imageDataUrl,
      prompt,
    });

    const composeLine = analysis
      .split("\n")
      .find((l) => l.trim().toUpperCase().startsWith("COMPOSE:"));
    if (composeLine) {
      const body = composeLine.replace(/^COMPOSE:\s*/i, "");
      const [emailPart, ...rest] = body.split("|");
      const to = emailPart?.trim().match(/\S+@\S+\.\S+/)?.[0];
      if (to) {
        const instruction = rest.join("|").trim() || input.userNote || `Follow up based on the uploaded image.`;
        const emailsQuery = buildEmailsComposeQuery({
          to,
          prompt: `${instruction}\n\nImage analysis:\n${analysis.slice(0, 2000)}`,
          autoGenerate: true,
        });
        return {
          ok: true,
          action: {
            type: "open_compose",
            emailsQuery,
            summary: `I analyzed the image and opened compose to ${to} with a draft. Summary:\n${analysis.slice(0, 500)}`,
          },
        };
      }
    }

    return {
      ok: true,
      action: {
        type: "reply",
        message: analysis,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Vision failed";
    return { ok: false, error: msg };
  }
}
