/**
 * Feature → AI routing (see docs/AI_SETUP.md)
 *
 * | CRM feature              | Stack                          | Wired in code        |
 * |--------------------------|--------------------------------|----------------------|
 * | Campaign email AI        | Workflow: chain → Gemini polish| generate-template    |
 * | Mailbox compose AI       | quick-copy chain               | generate-compose-email |
 * | Long proposal copy       | gemini-first chain             | —                    |
 * | Search embeddings        | OpenAI text-embedding-3-small| inngest / openai.ts  |
 * | Contact enrichment       | OpenAI + Firecrawl             | enrich routes        |
 * | Target browser research  | Anthropic + E2B                | enrich-target        |
 *
 * Note: xAI Grok is not the same as Groq — only GROQ_API_KEY is supported today.
 */

export type LlmTask =
  | "campaign-email"
  | "quick-copy"
  | "long-form-proposal";

export type LlmProviderId = "openrouter" | "groq" | "gemini" | "openai";

/** Performance-tuned defaults (override with LLM_CHAIN_<TASK>). */
export const PROVIDER_CHAIN: Record<LlmTask, LlmProviderId[]> = {
  // Fastest first for interactive UI
  "campaign-email": ["groq", "openrouter", "gemini", "openai"],
  "quick-copy": ["groq", "openrouter", "gemini", "openai"],
  // Longer context / tone
  "long-form-proposal": ["gemini", "openrouter", "openai", "groq"],
};
