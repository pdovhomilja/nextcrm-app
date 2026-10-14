import type { LlmProviderId, LlmTask } from "@/lib/llm/tasks";
import { PROVIDER_CHAIN } from "@/lib/llm/tasks";

const ALL: LlmProviderId[] = ["openrouter", "groq", "gemini", "openai"];

function parseChainEnv(envName: string): LlmProviderId[] | null {
  const raw = process.env[envName]?.trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim().toLowerCase()) as LlmProviderId[];
  const valid = parts.filter((p) => ALL.includes(p));
  return valid.length ? valid : null;
}

/** Task chain with optional env override, e.g. LLM_CHAIN_CAMPAIGN_EMAIL=groq,openrouter,gemini,openai */
export function providerChainForTask(task: LlmTask): LlmProviderId[] {
  const taskKey = task.toUpperCase().replace(/-/g, "_");
  return (
    parseChainEnv(`LLM_CHAIN_${taskKey}`) ??
    parseChainEnv("LLM_CHAIN_DEFAULT") ??
    PROVIDER_CHAIN[task]
  );
}
