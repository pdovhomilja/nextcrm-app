import { defaultModel } from "@/lib/llm/models";

/** Gemini OpenAI-compatible chat models — tried in order on 404. */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
] as const;

export function geminiModelsToTry(): string[] {
  const list = process.env.LLM_GEMINI_MODELS?.trim();
  if (list) {
    return list
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  const single = defaultModel("gemini");
  const defaults = [...DEFAULT_GEMINI_MODELS];
  if (single && !defaults.includes(single)) {
    return [single, ...defaults.filter((m) => m !== single)];
  }
  return defaults;
}
