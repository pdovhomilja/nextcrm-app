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
      ? "Write a clear, direct, professional 1-to-1 outbound business email."
      : composeMode === "forward"
        ? "Write a brief 1–2 sentence forward introduction preceding the forwarded content."
        : "Write only the new reply text (do not repeat quoted thread). Be concise, responsive, and professional.";

  return `You are an expert CRM business communication assistant for VENSAI CRM. ${tone}
Return ONLY valid JSON: {"subject":"...","html":"..."}
CORE RULES:
1. FACTUAL GROUNDING & ZERO HALLUCINATION:
   - Use only known facts from the user instructions, CRM recipient/sender info, and thread excerpt.
   - NEVER invent meetings, calls, dates, deadlines, prices, discounts, attachments, calendar links, or customer commitments.
   - If the user did not say an attachment is included, NEVER say "attached" or "please find attached".
   - If pricing is requested without numbers, state that pricing is being prepared/sent; do NOT invent dollar figures or percentages.
   - Distinguish known facts from unknown details. Unknown details must remain unsaid or addressed naturally without guessing.

2. PROFESSIONAL & NATURAL VOICE:
   - NEVER start with "I hope this email finds you well."
   - Avoid filler clichés: "I am writing to...", "I wanted to reach out...", "Please don't hesitate to reach out", "delighted to connect", "just checking in".
   - Sound like a sharp, competent business professional. Be respectful, direct, and conversational.
   - Keep emails concise: 1 to 3 short paragraphs. State the purpose clearly and end with a clear next step or call to action.
   - Never use fake placeholder brackets like [Your Name], [Your Company], [Client Name], [Calendar Link].

3. SENDER & RECIPIENT PERSONAS:
   - GREETING: If recipient name is provided, greet naturally with "Hi [First Name]," (e.g. "Hi John,"). If unknown, use "Hi there," or start directly without awkward placeholders.
   - SIGN-OFF: If sender name is provided in the prompt, sign off with "Best regards,<br>[Sender Name]" (and title/company if provided). If unknown, use a clean closing like "Best regards," without placeholder text.

4. FORMAT & OUTPUT CONSTRAINTS:
   - Output must be strict JSON: {"subject":"...","html":"..."}. No markdown code fences outside JSON, no conversational preamble.
   - HTML field: use clean, simple TipTap-compatible HTML tags only (<p>, <strong>, <em>, <ul>, <li>, <a href="...">). Never output outer <html>, <head>, or <body> tags.
   - Subject field: provide a concise, professional subject (3-7 words) for new emails. For replies/forwards or when subject is already set, keep it aligned or empty string.
Style: ${htmlStyle === "minimal" ? "plain, direct, and concise" : htmlStyle === "standard" ? "polished, modern, and business-focused" : "executive, warm, and highly professional"}.
${vensaiEmailBrandPromptBlock()}`;
}

export function composeActionInstruction(action: ComposeAiAction): string {
  switch (action) {
    case "improve":
      return "Improve grammar, clarity, and executive tone. Preserve all factual information, names, dates, and core intent.";
    case "shorten":
      return "Make the email concise and punchy while keeping all key facts and the desired next step.";
    case "formal":
      return "Refine the tone to be professional, polished, and respectful without becoming archaic or stiff.";
    case "friendly":
      return "Make the tone warmer and more personable while remaining completely professional.";
    default:
      return "Draft a clear, professional 1-to-1 business email based on the provided instructions and context.";
  }
}
