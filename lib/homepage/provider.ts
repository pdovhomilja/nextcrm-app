import { NonRetriableError } from "inngest";
import { extractJsonObject } from "@/lib/ai/anthropic-json";

export type GenerateHomepageInput = {
  apiKey: string;
  brief: string;
  prompt: string;
  previousHtml?: string;
  sourceScreenshotB64?: string;
  refinedScreenshotB64?: string;
};

/** Abort budget for the vision request; matches GENERATE_TIMEOUT_MS in the job. */
export const GENERATE_FETCH_TIMEOUT_MS = 200_000;

export type GenerateHomepageResult = { html: string; critique: string };

const SYSTEM_PROMPT = `You are a senior web designer producing a redesigned homepage for a small business.

Design rubric (follow strictly):
- Output ONE single, fully self-contained HTML document: inline <style>, no external CSS/JS frameworks, no build step. Web-safe font stacks or system fonts only.
- Responsive and mobile-first; must look correct from 360px to 1440px wide. Use fluid type and CSS grid/flexbox.
- Reuse the supplied brand: colors, business name, and real copy from the source site. Never invent phone numbers, addresses, testimonials, or claims that are not in the brief.
- Logo: if the brief supplies a logo placeholder token, use it verbatim as the logo <img>'s src attribute (it is substituted with the real logo). Otherwise render the business name as a clean styled text wordmark. NEVER reference a remote logo image URL.
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
  // Actually cancel the request on timeout (the job's withTimeout race only stops
  // waiting). Budget matches the job's per-pass generate timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_FETCH_TIMEOUT_MS);
  let data: { content?: { type?: string; text?: string }[]; stop_reason?: string };
  try {
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
      signal: controller.signal,
    });
    if (!res.ok) {
      // Deterministic 4xx (bad request / auth) fail identically on every retry —
      // don't burn retries (and vision billing) on them. But 408/409/429 are
      // TRANSIENT (timeout / conflict / rate limit) and MUST stay retriable, as
      // must all 5xx.
      const msg = `Anthropic request failed (${res.status})`;
      const transient = res.status === 408 || res.status === 409 || res.status === 429;
      if (res.status >= 400 && res.status < 500 && !transient) throw new NonRetriableError(msg);
      throw new Error(msg);
    }
    data = await res.json();
  } finally {
    clearTimeout(timeout);
  }
  // A response cut off at max_tokens yields HTML truncated mid-string that then
  // fails JSON.parse and would be retried three times at 12k tokens each. Fail fast.
  if (data?.stop_reason === "max_tokens") {
    throw new NonRetriableError(
      "AI response was cut off (max_tokens). Try a shorter prompt or simpler design.",
    );
  }
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
