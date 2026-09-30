import { GSAP_VERSION, ALLOWED_RENDER_HOSTS } from "@/lib/homepage/render-allowlist";

/**
 * Creative-direction fallback, used ONLY when no admin base prompt is configured.
 * Pure design direction — the machine contract (output shape, egress rules, logo
 * token) is NOT here; it is always appended by buildSystemPrompt.
 */
export const DEFAULT_BASE_PROMPT = `You are a senior web designer and creative director producing a premium, memorable redesigned homepage for a small business.

Creative direction:
- Design with a clear concept and a confident point of view; avoid the stock-template look, clutter, and dated patterns.
- Motion: staggered scroll reveals using GSAP ScrollTrigger, subtle parallax / scroll-linked movement, and tactile hover micro-interactions on links, buttons and cards. Motion must support the content, never obstruct it.
- Typography: a modular type scale with fluid sizing, and a tasteful Google Font pairing (one display face, one text face) with strong hierarchy.
- Layout: generous spacing on a consistent scale, a cohesive modern color system derived from the business's brand, responsive and mobile-first from 360px to 1440px using CSS grid/flexbox.
- Structure: a strong hero with one primary call to action, a concise value proposition, services/offerings, social proof only if supplied in the brief, and a clear contact section.
- Content integrity: reuse the supplied brand, business name, colors and real copy. Never invent phone numbers, addresses, testimonials, or claims that are not in the brief.
- Accessibility: semantic landmarks (header, main, section, footer), descriptive alt text, WCAG AA contrast, visible focus states, and a \`prefers-reduced-motion\` fallback that disables the animations.
- If screenshots are provided, they show the current (source) site and/or a previous attempt; preserve brand identity while fixing weaknesses.`;

/**
 * CODE-OWNED output/egress contract. ALWAYS appended to whatever base prompt is
 * in use, so an admin-edited (or empty) base can never change the JSON shape,
 * loosen the egress rules, or break the logo substitution. The host list and
 * GSAP URL are built from the render allowlist constants so this text can never
 * drift from what the renderer actually permits.
 */
const GSAP_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/gsap/${GSAP_VERSION}`;

export const MACHINE_CONTRACT = `Output contract (mandatory, overrides anything above):
- Respond with ONLY a JSON object, no prose: {"critique": "<2-3 sentences>", "html": "<the complete HTML document>"}.
- Output ONE single, fully self-contained HTML document.
- You MAY load external resources ONLY from these hosts: ${ALLOWED_RENDER_HOSTS.join(", ")}, and GSAP (with ScrollTrigger) from ${GSAP_BASE_URL}/gsap.min.js and ${GSAP_BASE_URL}/ScrollTrigger.min.js. No other remote resources of any kind.
- For the business logo, if a logo is provided use the EXACT token __RADE_LOGO_SRC__ as the logo <img> src (it is substituted with the real logo); otherwise render a clean text wordmark. Never reference any other logo URL.`;

/** Admin base (or the built-in default when null/blank) + the always-present machine contract. */
export function buildSystemPrompt(basePrompt: string | null): string {
  return `${basePrompt?.trim() || DEFAULT_BASE_PROMPT}\n\n${MACHINE_CONTRACT}`;
}
