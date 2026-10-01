import { imageToken, type ImageSpec } from "./types";

const clampText = (s: string | null, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Build a fixed, code-owned set of on-brand image prompts. Prompts use bounded brand
 * fields only (never raw harvested HTML) to limit indirect prompt-injection. */
export function planHomepageImages(input: {
  count: number;
  industry: string | null;
  company: string | null;
  description: string | null;
  colors: string[];
}): ImageSpec[] {
  const n = Math.max(0, Math.trunc(input.count));
  if (n === 0) return [];
  const industry = clampText(input.industry, 60) || "small business";
  const desc = clampText(input.description, 180);
  const palette = input.colors.slice(0, 4).join(", ");
  const paletteClause = palette ? ` Color palette: ${palette}.` : "";
  const common = `Premium editorial photograph for a ${industry}.${paletteClause} Warm, sophisticated, photorealistic, Architectural Digest style, soft natural light, shallow depth of field. No text, no signage, no logos, no watermarks.`;
  const sectionSubjects = ["a detail vignette of the space", "a service/treatment moment", "a welcoming interior corner", "textures and materials close-up", "the storefront or entrance"];
  const specs: ImageSpec[] = [
    {
      token: imageToken(1),
      role: "hero",
      aspectRatio: "16:9",
      prompt: `${common} Wide establishing hero shot of the interior.${desc ? ` Context: ${desc}.` : ""}`,
      alt: `${industry} interior`,
    },
  ];
  for (let i = 1; i < n; i++) {
    specs.push({
      token: imageToken(i + 1),
      role: "section",
      aspectRatio: "4:5",
      prompt: `${common} ${sectionSubjects[(i - 1) % sectionSubjects.length]}.`,
      alt: `${industry} — ${sectionSubjects[(i - 1) % sectionSubjects.length]}`,
    });
  }
  return specs;
}
