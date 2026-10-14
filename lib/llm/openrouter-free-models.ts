import { defaultModel } from "@/lib/llm/models";

/**
 * Default OpenRouter $0 models (tried in order on rate limits).
 * Override entirely with LLM_OPENROUTER_FREE_MODELS in Vercel / .env.local.
 * Verify ids on https://openrouter.ai/models?q=free — slugs change occasionally.
 */
export const DEFAULT_OPENROUTER_FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
] as const;

/**
 * OpenRouter free models — comma-separated env or built-in default list above.
 */
export function openRouterModelsToTry(): string[] {
  const list = process.env.LLM_OPENROUTER_FREE_MODELS?.trim();
  if (list) {
    return list
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_OPENROUTER_FREE_MODELS];
}

/** First model in the try-list (for logging / metadata). */
export function primaryOpenRouterModel(): string {
  const models = openRouterModelsToTry();
  return models[0] ?? defaultModel("openrouter");
}
