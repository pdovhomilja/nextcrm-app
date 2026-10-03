import { imageToken, type ImageSpec } from "./types";

const clampText = (s: string | null, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Validate and bound hex color strings. Keep only valid hex colors (#RGB, #RRGGBB, #RRGGBBAA).
 * This prevents injection via malicious "color" fields. */
const validatedColors = (colors: string[]): string[] => {
  return colors
    .map((c) => c.trim())
    .filter((c) => /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/.test(c))
    .slice(0, 4);
};

/** Build a fixed, code-owned set of on-brand image prompts. Prompts use bounded brand
 * fields only (never raw harvested HTML) to limit indirect prompt-injection. */
export function planHomepageImages(input: {
  count: number;
  industry: string | null;
  company: string | null;
  description: string | null;
  colors: string[];
}): ImageSpec[] {
  // Guard against non-finite or oversized count.
  const n = Number.isFinite(input.count) ? Math.min(Math.max(0, Math.trunc(input.count)), 12) : 0;
  if (n === 0) return [];

  const industry = clampText(input.industry, 60) || "small business";
  const desc = clampText(input.description, 180);
  // Validate and bound colors to prevent injection (keep only valid hex).
  const palette = validatedColors(input.colors).join(", ");
  const paletteClause = palette ? ` Color palette: ${palette}.` : "";
  const common = `Premium editorial photograph for a ${industry}.${paletteClause} Warm, sophisticated, photorealistic, Architectural Digest style, soft natural light, shallow depth of field. No text, no signage, no logos, no watermarks.`;
  const sectionSubjects = ["a detail vignette of the space", "a service/treatment moment", "a welcoming interior corner", "textures and materials close-up", "the storefront or entrance"];

  const specs: ImageSpec[] = [];
  // Hero spec (role 1).
  const heroPrompt = `${common} Wide establishing hero shot of the interior.${desc ? ` Context: ${desc}.` : ""}`;
  specs.push({
    token: imageToken(1),
    role: "hero",
    aspectRatio: "16:9",
    // Hard backstop: clamp final prompt to 600 chars to guarantee bound regardless of field combination.
    prompt: heroPrompt.slice(0, 600),
    alt: `${industry} interior`,
  });

  // Section specs.
  for (let i = 1; i < n; i++) {
    const sectionPrompt = `${common} ${sectionSubjects[(i - 1) % sectionSubjects.length]}.`;
    specs.push({
      token: imageToken(i + 1),
      role: "section",
      aspectRatio: "2:3",
      // Hard backstop: clamp final prompt to 600 chars.
      prompt: sectionPrompt.slice(0, 600),
      alt: `${industry} — ${sectionSubjects[(i - 1) % sectionSubjects.length]}`,
    });
  }
  return specs;
}

/**
 * Build the spec for ONE replacement image requested during a refine.
 *
 * The subject comes from a BOUNDED slice of the operator's refine instruction
 * (first-party, authenticated text), clamped to limit any prompt-injection into
 * the image provider — the same bounding the business `description` already gets.
 * Deliberately does NOT feed in model/HTML-derived alt text (which can carry
 * harvested-site content), keeping the injection surface to first-party input only.
 * The on-brand style scaffold is code-owned, exactly like {@link planHomepageImages}.
 */
export function planRefineImage(input: {
  token: string;
  /** The operator's refine instruction (what to show in the replacement image). */
  hint: string;
  industry: string | null;
  colors: string[];
}): ImageSpec {
  const industry = clampText(input.industry, 60) || "small business";
  const palette = validatedColors(input.colors).join(", ");
  const paletteClause = palette ? ` Color palette: ${palette}.` : "";
  const common = `Premium editorial photograph for a ${industry}.${paletteClause} Warm, sophisticated, photorealistic, Architectural Digest style, soft natural light, shallow depth of field. No text, no signage, no logos, no watermarks.`;
  const subject = clampText(input.hint, 180);
  return {
    token: input.token,
    role: "section",
    aspectRatio: "2:3",
    // Hard backstop: clamp final prompt to 600 chars regardless of field lengths.
    prompt: `${common}${subject ? ` Subject: ${subject}.` : ""}`.slice(0, 600),
    alt: subject ? subject.slice(0, 80) : industry,
  };
}
