import type { LlmProviderId, LlmTask } from "@/lib/llm/tasks";

const BASE_MODELS: Record<LlmProviderId, string> = {
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  groq: "openai/gpt-oss-20b",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
};

/** Per-provider override: LLM_OPENROUTER_MODEL, LLM_GROQ_MODEL, … */
export function defaultModel(provider: LlmProviderId): string {
  const envName = `LLM_${provider.toUpperCase()}_MODEL`;
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  return BASE_MODELS[provider];
}

/** Per-task override: LLM_MODEL_CAMPAIGN_EMAIL=groq:llama-3.3-70b-versatile (provider:model) */
export function modelForTask(provider: LlmProviderId, task: LlmTask): string {
  const taskKey = task.toUpperCase().replace(/-/g, "_");
  const spec = process.env[`LLM_MODEL_${taskKey}`]?.trim();
  if (spec) {
    const [p, model] = spec.split(":").map((s) => s.trim());
    if (p === provider && model) return model;
  }
  return defaultModel(provider);
}
