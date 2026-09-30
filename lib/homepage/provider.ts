import { extractJsonObject } from "@/lib/ai/anthropic-json";

export type GenerateHomepageInput = {
  apiKey: string;
  brief: string;
  prompt: string;
  previousHtml?: string;
  sourceScreenshotB64?: string;
  refinedScreenshotB64?: string;
};

export type GenerateHomepageResult = { html: string; critique: string };

const SYSTEM_PROMPT = `You are a senior web designer producing a redesigned homepage for a small business.

Design rubric (follow strictly):
- Output ONE single, fully self-contained HTML document: inline <style>, no external CSS/JS frameworks, no build step. Web-safe font stacks or system fonts only.
- Responsive and mobile-first; must look correct from 360px to 1440px wide. Use fluid type and CSS grid/flexbox.
- Reuse the supplied brand: colors, logo, business name, and real copy from the source site. Never invent phone numbers, addresses, testimonials, or claims that are not in the brief.
- Strong visual hierarchy: clear hero with one primary call to action, concise value proposition, services/offerings, social proof only if supplied, contact section.
- Generous whitespace, consistent spacing scale, accessible contrast (WCAG AA), semantic landmarks (header, main, section, footer), descriptive alt text.
- Modern and clean; avoid clutter, stock-template look, and dated patterns. No scripts that fetch remote resources.
- If screenshots are provided, they show the current (source) site and/or a previous attempt; use them to preserve brand identity while fixing weaknesses.

Respond with ONLY a JSON object, no prose, of the form:
{"critique": "<brief critique of the source/previous design and what you changed>", "html": "<the complete HTML document>"}`;

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/png"; data: string } };

const imageBlock = (data: string): ContentBlock => ({
  type: "image",
  source: { type: "base64", media_type: "image/png", data },
});

export async function generateHomepage(
  input: GenerateHomepageInput,
): Promise<GenerateHomepageResult> {
  const { apiKey, brief, prompt, previousHtml, sourceScreenshotB64, refinedScreenshotB64 } = input;

  const content: ContentBlock[] = [];
  if (sourceScreenshotB64) content.push(imageBlock(sourceScreenshotB64));
  if (refinedScreenshotB64) content.push(imageBlock(refinedScreenshotB64));

  const instructionParts: string[] = [];
  if (previousHtml) {
    instructionParts.push(`Previous HTML draft to improve:\n${previousHtml}`);
  }
  const imageNotes: string[] = [];
  if (sourceScreenshotB64) imageNotes.push("the first image is a screenshot of the current source site");
  if (refinedScreenshotB64)
    imageNotes.push(
      `${sourceScreenshotB64 ? "the second" : "the"} image is a screenshot of the previous generated draft, rendered`,
    );
  if (imageNotes.length) instructionParts.push(`Attached: ${imageNotes.join("; ")}.`);
  instructionParts.push(`Operator instructions:\n${prompt}`);
  instructionParts.push(`Business brief (brand, copy, facts):\n${brief}`);
  content.push({ type: "text", text: instructionParts.join("\n\n") });

  // ANTHROPIC_BASE_URL is an optional test seam (same as generate-target-email.ts).
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed (${res.status})`);

  const data = await res.json();
  const text: string =
    (data?.content ?? []).find((b: { type?: string }) => b?.type === "text")?.text ?? "";
  const raw = extractJsonObject(text);
  if (!raw) throw new Error("AI returned an unexpected response (no JSON)");
  let parsed: { critique?: unknown; html?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned an unexpected response (invalid JSON)");
  }
  if (typeof parsed.html !== "string" || !parsed.html || typeof parsed.critique !== "string")
    throw new Error("AI returned an unexpected response (missing html/critique)");
  return { html: parsed.html, critique: parsed.critique };
}
