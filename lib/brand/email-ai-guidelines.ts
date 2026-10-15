import { VENSAI_BRAND } from "@/lib/brand/vensai";

/** Injected into LLM system prompts for campaign + compose email generation. */
export function vensaiEmailBrandPromptBlock(): string {
  const c = VENSAI_BRAND.colors;
  return `VenSai brand identity (must follow):
- Company: ${VENSAI_BRAND.companyName}; product: VenSai CRM.
- Tagline: "${VENSAI_BRAND.tagline}" — ${VENSAI_BRAND.servicesLine}.
- Colors: primary CTA/buttons ${c.primary} (hover ${c.primaryDark}); headings ${c.navy}; body text ${c.text}; muted ${c.muted}; backgrounds ${c.canvas} and white cards.
- Typography: clean sans-serif, generous spacing, accessible contrast.
- Tone: professional, modern, trustworthy — not generic spam.
- Primary buttons: rounded 6–8px, white text on ${c.primary}, inline style only.
- Do not use unrelated stock branding or other company names.`;
}
