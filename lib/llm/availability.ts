import { getApiKey } from "@/lib/api-keys";
import { envSecret } from "@/lib/env-secret";
import type { LlmProviderId } from "@/lib/llm/tasks";

const PROVIDERS: LlmProviderId[] = ["openrouter", "groq", "gemini", "openai"];

export async function getConfiguredLlmProviders(userId?: string): Promise<LlmProviderId[]> {
  const configured: LlmProviderId[] = [];
  for (const provider of PROVIDERS) {
    if (await hasLlmProviderKey(provider, userId)) configured.push(provider);
  }
  return configured;
}

export async function hasLlmProviderKey(
  provider: LlmProviderId,
  userId?: string
): Promise<boolean> {
  switch (provider) {
    case "openrouter":
      return Boolean(envSecret("OPENROUTER_API_KEY") ?? envSecret("OPENROUTER_KEY"));
    case "gemini":
      return Boolean(
        envSecret("GEMINI_API_KEY") ?? envSecret("GOOGLE_GENERATIVE_AI_API_KEY")
      );
    case "groq":
      return Boolean(await getApiKey("GROQ", userId));
    case "openai":
      return Boolean(await getApiKey("OPENAI", userId));
    default:
      return false;
  }
}
