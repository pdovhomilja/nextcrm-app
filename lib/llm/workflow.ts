import {
  completeChat,
  type ChatMessage,
  type CompleteChatResult,
} from "@/lib/llm/chat-completion";
import {
  parseQualityMode,
  QUALITY_MODE_CONFIG,
  type AiQualityMode,
} from "@/lib/llm/quality-modes";
import type { LlmTask } from "@/lib/llm/tasks";

function polishEnabled(mode: AiQualityMode): boolean {
  const flag = process.env.LLM_WORKFLOW?.trim();
  if (flag === "0" || flag?.toLowerCase() === "false") return false;
  return QUALITY_MODE_CONFIG[mode].polish;
}

async function geminiPolish(options: {
  userId?: string;
  task: LlmTask;
  draft: string;
  userBrief: string;
}): Promise<string | null> {
  const isJson =
    options.draft.trim().startsWith("{") || options.draft.includes('"html"');
  const isCampaign = options.task === "campaign-email";

  try {
    const result = await completeChat({
      task: options.task,
      userId: options.userId,
      messages: [
        {
          role: "system",
          content: isJson
            ? isCampaign
              ? 'Improve this marketing email JSON. Keep merge tags. Return ONLY valid JSON: {"subject":"...","html":"..."}'
              : 'Improve this 1-to-1 CRM business email JSON. Polish clarity, tone, and conciseness while strictly preserving all facts, names, and JSON structure. Return ONLY valid JSON: {"subject":"...","html":"..."}'
            : "Improve clarity and professional tone. Keep the same language and intent. Output only the improved text, no commentary.",
        },
        {
          role: "user",
          content: `Brief: ${options.userBrief}\n\nDraft:\n${options.draft}`,
        },
      ],
      temperature: 0.35,
      timeoutMs: 25_000,
      providersOverride: ["gemini"],
    });
    return result.content;
  } catch {
    return null;
  }
}

export type WorkflowResult = CompleteChatResult & {
  stages: string[];
};

/**
 * Combination workflow (when LLM_WORKFLOW=1 or Gemini key present):
 * 1) Fast chain draft (Groq → OpenRouter free → …)
 * 2) Gemini polish (optional)
 * 3) OpenAI refine handled in generate-template via refineCampaignEmailJson
 */
export async function completeChatWorkflow(options: {
  task: LlmTask;
  userId?: string;
  messages: ChatMessage[];
  userBrief?: string;
  temperature?: number;
  timeoutMs?: number;
  mode?: AiQualityMode;
}): Promise<WorkflowResult> {
  const mode = parseQualityMode(options.mode);
  const modeConfig = QUALITY_MODE_CONFIG[mode];
  const stages: string[] = [`mode:${mode}`];

  const draft = await completeChat({
    ...options,
    temperature: options.temperature ?? modeConfig.temperature,
    timeoutMs: options.timeoutMs ?? modeConfig.timeoutMs,
    providersOverride: modeConfig.chain,
  });
  stages.push(`draft:${draft.provider}/${draft.model}`);

  if (!polishEnabled(mode)) {
    return { ...draft, stages };
  }

  const userBrief =
    options.userBrief ??
    options.messages.filter((m) => m.role === "user").pop()?.content ??
    "";

  if (draft.provider !== "gemini" && draft.provider !== "openai") {
    const polished = await geminiPolish({
      userId: options.userId,
      task: options.task,
      draft: draft.content,
      userBrief,
    });
    if (polished) {
      stages.push("polish:gemini");
      return {
        content: polished,
        provider: draft.provider,
        model: `${draft.model}+gemini-polish`,
        stages,
      };
    }
  }

  return { ...draft, stages };
}
