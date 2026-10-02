import type { PrismaClient } from "@prisma/client";

/**
 * Fixed identity of the default HOMEPAGE_BASE prompt. The SAME id + body are
 * inserted (idempotently) by migration 20260930130200_seed_homepage_base_prompt
 * so hosted environments get the row without running the seed. Keep the two in
 * sync if the body is ever edited.
 *
 * The body is craft-only creative direction (spec Appendix A.1): the section
 * structure and visual style come from the HOMEPAGE_INDUSTRY / HOMEPAGE_STYLE
 * layers (see homepage-prompt-layers.ts). The machine contract (output format,
 * allowed resources, placeholders) is appended in code by buildSystemPrompt.
 *
 * The body was refactored by migration 20261001130000_seed_homepage_prompt_layers,
 * which updates the originally-seeded row ONLY if it is still byte-identical to
 * the old seeded text (so operator edits are never clobbered).
 */
export const HOMEPAGE_BASE_PROMPT_ID = "00000000-0000-4000-8000-00000000ba5e";
export const HOMEPAGE_BASE_PROMPT_NAME = "Premium homepage (default)";
export const HOMEPAGE_BASE_PROMPT_BODY = `You are a senior web designer and creative director producing a premium, memorable homepage for a small business. Focus on CRAFT, independent of any particular visual style:
- A clear concept and confident point of view; never a stock-template feel.
- A modular, fluid type scale with strong hierarchy and a tasteful Google Font pairing.
- Generous, consistent spacing; a cohesive color system derived from the business's real brand; responsive and mobile-first from 360px to 1440px with CSS grid/flexbox.
- Motion that supports content, never obstructs it: staggered scroll reveals (GSAP ScrollTrigger), restrained parallax, tactile hover micro-interactions — with a \`prefers-reduced-motion\` fallback that disables them.
- Accessibility: semantic landmarks, descriptive alt text, AA contrast, visible focus states.
- Content integrity: reuse only the supplied brand, name, colors, and real copy. Never invent phone numbers, addresses, emails, testimonials, hours, or claims.
- If screenshots are provided, they show the current site and/or a previous attempt; preserve brand identity while fixing weaknesses. Design around real photography when images are provided.
The page's section structure and visual style come from the layers that follow; do not impose a fixed section recipe here.`;

/** Idempotent: safe to re-run. Re-running resets the seeded default to the code body. */
export async function seedHomepageBasePrompt(prisma: PrismaClient): Promise<void> {
  await prisma.crm_Ai_Prompt.upsert({
    where: { id: HOMEPAGE_BASE_PROMPT_ID },
    update: {
      name: HOMEPAGE_BASE_PROMPT_NAME,
      body: HOMEPAGE_BASE_PROMPT_BODY,
      kind: "HOMEPAGE_BASE",
      scope: "ORG",
      is_default: true,
    },
    create: {
      id: HOMEPAGE_BASE_PROMPT_ID,
      name: HOMEPAGE_BASE_PROMPT_NAME,
      body: HOMEPAGE_BASE_PROMPT_BODY,
      kind: "HOMEPAGE_BASE",
      scope: "ORG",
      is_default: true,
      created_by: null,
    },
  });
}
