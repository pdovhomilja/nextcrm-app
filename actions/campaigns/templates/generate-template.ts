"use server";

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import {
  completeChatWorkflow,
  refineCampaignEmailJson,
} from "@/lib/llm";
import { parseCampaignEmailJson } from "@/lib/llm/parse-content";
import {
  campaignEmailSystemPrompt,
  parseQualityMode,
  QUALITY_MODE_CONFIG,
  type AiQualityMode,
} from "@/lib/llm/quality-modes";
import {
  generateCampaignHeroImage,
  injectHeroImageIntoHtml,
} from "@/lib/llm/openrouter-image";
import { getConfiguredLlmProviders } from "@/lib/llm/availability";
import {
  appendMemoriesToSystem,
  recallMemoriesForPrompt,
  rememberConversationTurn,
} from "@/lib/mem0/crm-memory";

export type GenerateTemplateOptions = {
  mode?: AiQualityMode;
  includeHeroImage?: boolean;
};

export type GenerateTemplateResult =
  | { ok: true; html: string; json: object; subject: string }
  | { ok: false; error: string };

const MAX_HTML_LENGTH = 350_000;

function shrinkHtmlForAction(html: string): string {
  if (html.length <= MAX_HTML_LENGTH) return html;
  return html.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, "").slice(0, MAX_HTML_LENGTH);
}

export const generateTemplate = async (
  prompt: string,
  options?: GenerateTemplateOptions
): Promise<GenerateTemplateResult> => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Describe the email you want to generate." };
  }

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { ok: false, error: "Unauthorized — sign in again." };
    }
    console.error("[generate-template] auth", e);
    return { ok: false, error: "Could not verify your session." };
  }

  try {
    const mode = parseQualityMode(options?.mode);
    const modeConfig = QUALITY_MODE_CONFIG[mode];
    const includeHeroImage = Boolean(options?.includeHeroImage) && mode !== "fast";

    const campaignMemories = await recallMemoriesForPrompt({
      userId: user.id,
      query: `${trimmed} brand voice campaign marketing`,
      surface: "campaign-email",
    });

    const { content, provider, stages } = await completeChatWorkflow({
      task: "campaign-email",
      userId: user.id,
      userBrief: trimmed,
      mode,
      messages: [
        {
          role: "system",
          content: appendMemoriesToSystem(
            campaignEmailSystemPrompt(modeConfig.htmlStyle),
            campaignMemories
          ),
        },
        { role: "user", content: trimmed },
      ],
    });

    if (stages.length > 0) {
      console.info("[generate-template] LLM workflow:", stages.join(" → "));
    }

    let jsonText = content;
    const refined = await refineCampaignEmailJson({
      userId: user.id,
      draftJson: content,
      userPrompt: trimmed,
      force: modeConfig.refineJson,
    });
    if (refined) jsonText = refined;

    let parsed: { subject: string; html: string };
    try {
      parsed = parseCampaignEmailJson(jsonText, trimmed);
    } catch {
      return {
        ok: false,
        error: `AI returned unusable output (${provider}, ${mode}). Try Better/Best or a shorter prompt.`,
      };
    }

    let html = parsed.html ?? "";
    if (!html.trim()) {
      return { ok: false, error: "AI returned empty HTML. Try a clearer prompt or another quality mode." };
    }

    if (includeHeroImage) {
      const imagePrompt = `Professional email marketing hero banner, no text in image: ${trimmed.slice(0, 500)}`;
      const imageSrc = await generateCampaignHeroImage({ prompt: imagePrompt, mode });
      if (imageSrc) {
        html = injectHeroImageIntoHtml(html, imageSrc, parsed.subject || "Campaign hero");
        console.info("[generate-template] hero image injected via OpenRouter");
      }
    }

    html = shrinkHtmlForAction(html);

    void rememberConversationTurn({
      userId: user.id,
      surface: "campaign-email",
      userText: trimmed,
      assistantText: `Subject: ${parsed.subject ?? ""}\n${html.slice(0, 1500)}`,
    });

    return {
      ok: true,
      subject: parsed.subject ?? "",
      html,
      json: {},
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-template]", msg, e);
    if (/No LLM available/i.test(msg)) {
      const configured = await getConfiguredLlmProviders(user.id);
      const attemptsMatch = msg.match(/Attempts:\s*(.+)$/i);
      const attempts = attemptsMatch?.[1]?.trim();
      if (configured.length === 0) {
        return {
          ok: false,
          error:
            "No AI keys found at runtime. Add OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY on Vercel (Production), then redeploy — not only Preview.",
        };
      }
      return {
        ok: false,
        error: attempts
          ? `AI keys are set (${configured.join(", ")}) but every provider failed. ${attempts}. Try Quality: Good, or fix invalid/expired keys on Vercel.`
          : `AI keys are set (${configured.join(", ")}) but all providers failed. Redeploy after env changes, or try Quality: Good.`,
      };
    }
    if (/429|rate|quota/i.test(msg)) {
      return {
        ok: false,
        error: "AI rate limit hit. Wait a minute, switch to Good/Better mode, or add another provider key.",
      };
    }
    return {
      ok: false,
      error: msg || "AI generation failed. Check Vercel function logs for details.",
    };
  }
};
