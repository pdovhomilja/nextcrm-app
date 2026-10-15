import { defaultModel } from "@/lib/llm/models";

/**
 * Groq chat models (Oct 2026+). llama-3.1-8b-instant / llama-3.3-70b-versatile are retired on free tier.
 * Override: LLM_GROQ_MODELS=openai/gpt-oss-20b,qwen/qwen3.8-27b
 * @see https://console.groq.com/docs/deprecations
 */
export const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
] as const;

export function groqModelsToTry(): string[] {
  const list = process.env.LLM_GROQ_MODELS?.trim();
  if (list) {
    return list
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  const single = defaultModel("groq");
  const defaults: string[] = [...DEFAULT_GROQ_MODELS];
  if (single && !defaults.includes(single)) {
    return [single, ...defaults.filter((m) => m !== single)];
  }
  return defaults;
}
