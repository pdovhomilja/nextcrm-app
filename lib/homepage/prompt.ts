import { GSAP_VERSION, ALLOWED_RENDER_HOSTS } from "@/lib/homepage/render-allowlist";
import type { GeneratedImage } from "@/lib/homepage/images/types";

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
- Content integrity: reuse the supplied brand, business name, colors and real copy. Never invent phone numbers, addresses, testimonials, or claims that are not in the brief.
- Accessibility: semantic landmarks (header, main, section, footer), descriptive alt text, WCAG AA contrast, visible focus states, and a \`prefers-reduced-motion\` fallback that disables the animations.
- If screenshots are provided, they show the current (source) site and/or a previous attempt; preserve brand identity while fixing weaknesses.
- Design AROUND real photography: a photographic hero and image-led sections carry the premium feel — avoid flat color-block layouts when images are provided.`;

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
- Never invent phone numbers, addresses, emails, testimonials, hours, or facts that are not in the brief; reuse only the supplied brand and copy.
- You MAY load external resources ONLY from these hosts: ${ALLOWED_RENDER_HOSTS.join(", ")}, and GSAP (with ScrollTrigger) from ${GSAP_BASE_URL}/gsap.min.js and ${GSAP_BASE_URL}/ScrollTrigger.min.js. No other remote resources of any kind.
- For the business logo, if a logo is provided use the EXACT token __RADE_LOGO_SRC__ as the logo <img> src (it is substituted with the real logo); otherwise render a clean text wordmark. Never reference any other logo URL.
- Images: use ONLY the provided image tokens (__RADE_IMG_1__ and others) as <img> src where imagery strengthens the design; each token at most once; every <img> needs descriptive alt text; the tokens resolve to hosted images and will load. Do not reference any other image URL. If no image tokens are provided, use strong typography, color and CSS/SVG art instead.`;

export interface PromptLayers {
  /** Admin base prompt; null/blank falls back to DEFAULT_BASE_PROMPT. */
  base: string | null;
  /** Industry layer (page structure / sector conventions). Optional. */
  industry?: string | null;
  /** Style layer (visual direction). Optional. */
  style?: string | null;
  /** Avoid layer (things to steer away from). Optional. */
  avoid?: string | null;
}

/** Default cap on the composed system prompt, in characters (~3k tokens). */
export const DEFAULT_MAX_PROMPT_CHARS = 12000;

const LAYER_HEADERS = {
  industry: "Industry guidance:",
  style: "Visual style:",
  avoid: "Avoid:",
} as const;

/**
 * Composes the system prompt from layers, in precedence order:
 * base (or DEFAULT_BASE_PROMPT) -> industry -> style -> avoid -> MACHINE_CONTRACT.
 * Empty/blank layers are dropped. MACHINE_CONTRACT is code-owned, always present
 * and always LAST, so no layer can override it. If the result exceeds
 * `opts.maxChars`, optional layers are dropped in reverse precedence
 * (avoid, then style, then industry) until it fits; base and the contract are
 * never dropped (so an impossibly small cap still yields base + contract).
 */
export function buildSystemPrompt(
  layers: PromptLayers,
  opts: { maxChars?: number } = {},
): string {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_PROMPT_CHARS;
  const base = layers.base?.trim() || DEFAULT_BASE_PROMPT;

  const optional = (["industry", "style", "avoid"] as const)
    .map((kind) => {
      const body = layers[kind]?.trim();
      return body ? { kind, text: `${LAYER_HEADERS[kind]}\n${body}` } : null;
    })
    .filter((l): l is { kind: "industry" | "style" | "avoid"; text: string } => l !== null);

  const compose = () =>
    [base, ...optional.map((l) => l.text), MACHINE_CONTRACT].join("\n\n");

  let out = compose();
  const dropped: { kind: string; length: number }[] = [];
  while (out.length > maxChars && optional.length > 0) {
    const d = optional.pop()!; // last = lowest precedence (avoid, then style, then industry)
    dropped.push({ kind: d.kind, length: d.text.length });
    out = compose();
  }
  if (dropped.length > 0) {
    console.warn(
      `[HOMEPAGE_PROMPT] prompt exceeded ${maxChars} chars; dropped layer(s): ` +
        dropped.map((d) => `${d.kind} (${d.length} chars)`).join(", "),
    );
  }
  return out;
}

/**
 * Returns a per-run list of available image tokens with their alt text,
 * or a line telling the model no images are available.
 */
export function buildImageBrief(images: GeneratedImage[]): string {
  if (!images.length) {
    return "No images available — rely on typography, color and CSS/SVG art.";
  }
  const lines = images.map((i) => `- ${i.token} — ${i.alt}`);
  return `Available image tokens (use as <img> src; each once; add alt text):\n${lines.join("\n")}`;
}
