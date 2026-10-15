import { vensaiEmailBrandPromptBlock } from "@/lib/brand/email-ai-guidelines";
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

  return `${base}\n${vensaiEmailBrandPromptBlock()}\n${styleBlock[htmlStyle]}`;
}

export type MailboxComposeMode = "new" | "reply" | "reply-all" | "forward";

export type ComposeAiAction = "draft" | "improve" | "shorten" | "formal" | "friendly";

export function mailboxComposeSystemPrompt(
  htmlStyle: QualityModeConfig["htmlStyle"],
  composeMode: MailboxComposeMode
): string {
  const tone =
    composeMode === "new"
      ? "Write a clear outbound business email."
      : composeMode === "forward"
        ? "Write a short forward introduction (1–2 sentences) before the forwarded content the user will paste below."
        : "Write only the new reply text (do not repeat quoted thread). Be concise and professional.";

  return `You are an expert business email assistant. ${tone}
Return ONLY valid JSON: {"subject":"...","html":"..."}
Rules:
- HTML: simple TipTap-friendly tags only (<p>, <strong>, <em>, <ul>, <li>, <a href="">). No tables unless necessary. No outer <html> wrapper.
- subject: omit or empty string if the user already has a subject and this is a reply/forward.
- Do not invent facts; use only context provided.
- Sign off with a neutral closing (e.g. Best regards) and a placeholder for the sender name if unknown.
Style: ${htmlStyle === "minimal" ? "plain and direct" : htmlStyle === "standard" ? "polished but brief" : "warm and professional"}.
${vensaiEmailBrandPromptBlock()}`;
}

export function composeActionInstruction(action: ComposeAiAction): string {
  switch (action) {
    case "improve":
      return "Improve grammar, clarity, and tone. Keep meaning and length similar.";
    case "shorten":
      return "Make it shorter while keeping key points.";
    case "formal":
      return "Make the tone more formal and professional.";
    case "friendly":
      return "Make the tone warmer and more friendly while staying professional.";
    default:
      return "Draft the email from the user's instructions.";
  }
}
