import type { LlmProviderId } from "@/lib/llm/tasks";

export type AiQualityMode = "fast" | "good" | "better" | "best";

export const AI_QUALITY_MODES: AiQualityMode[] = ["fast", "good", "better", "best"];

export type QualityModeConfig = {
  label: string;
  description: string;
  chain: LlmProviderId[];
  /** Run Gemini polish after draft */
  polish: boolean;
  /** Ask OpenAI to fix JSON (when key exists) */
  refineJson: boolean;
  temperature: number;
  timeoutMs: number;
  /** Richer HTML instructions for campaign emails */
  htmlStyle: "minimal" | "standard" | "premium" | "luxury";
  /** Try OpenRouter image hero when user enables image */
  imageTier: "skip" | "standard" | "high";
};

export const QUALITY_MODE_CONFIG: Record<AiQualityMode, QualityModeConfig> = {
  fast: {
    label: "Fast",
    description: "Groq / OpenRouter free — quickest draft",
    chain: ["groq", "openrouter"],
    polish: false,
    refineJson: false,
    temperature: 0.6,
    timeoutMs: 20_000,
    htmlStyle: "minimal",
    imageTier: "skip",
  },
  good: {
    label: "Good",
    description: "Free stack + Gemini fallback",
    chain: ["groq", "openrouter", "gemini"],
    polish: false,
    refineJson: false,
    temperature: 0.65,
    timeoutMs: 25_000,
    htmlStyle: "standard",
    imageTier: "standard",
  },
  better: {
    label: "Better",
    description: "Full chain + Gemini polish",
    chain: ["groq", "openrouter", "gemini", "openai"],
    polish: true,
    refineJson: false,
    temperature: 0.7,
    timeoutMs: 35_000,
    htmlStyle: "premium",
    imageTier: "standard",
  },
  best: {
    label: "Best",
    description: "Quality-first + polish + OpenAI JSON refine",
    chain: ["gemini", "openai", "openrouter", "groq"],
    polish: true,
    refineJson: true,
    temperature: 0.75,
    timeoutMs: 45_000,
    htmlStyle: "luxury",
    imageTier: "high",
  },
};

export function parseQualityMode(value: string | undefined | null): AiQualityMode {
  const v = value?.trim().toLowerCase();
  if (v && AI_QUALITY_MODES.includes(v as AiQualityMode)) return v as AiQualityMode;
  return "good";
}

export function campaignEmailSystemPrompt(htmlStyle: QualityModeConfig["htmlStyle"]): string {
  const base = `You are an expert email designer and copywriter. Generate a professional HTML email body and subject line.
Return ONLY valid JSON: {"subject":"...", "html":"..."}
Use merge tags {{first_name}}, {{last_name}}, {{email}}, {{company}}, {{position}} where appropriate.
The HTML must use inline CSS only (email-client safe). Include a clear hero area at the top with id="email-hero" (empty or placeholder) when a hero image will be added later.`;

  const styleBlock: Record<QualityModeConfig["htmlStyle"], string> = {
    minimal:
      "Layout: single column, simple typography, one CTA button, plenty of whitespace.",
    standard:
      "Layout: header bar, hero section, 2–3 content blocks, primary CTA, footer with unsubscribe placeholder.",
    premium:
      "Layout: polished marketing email — gradient header, card sections, icon bullets, dual CTAs, mobile-friendly table layout, accessible contrast.",
    luxury:
      "Layout: boutique newsletter — elegant serif/sans pairing, subtle borders, testimonial quote block, highlighted offer box, premium spacing and micro-copy.",
  };

  return `${base}\n${styleBlock[htmlStyle]}`;
}
