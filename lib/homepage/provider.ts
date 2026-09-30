import { NonRetriableError } from "inngest";
import { extractJsonObject } from "@/lib/ai/anthropic-json";

export type GenerateHomepageInput = {
  apiKey: string;
  brief: string;
  prompt: string;
  previousHtml?: string;
  sourceScreenshotB64?: string;
  refinedScreenshotB64?: string;
  /** Full system prompt (see buildSystemPrompt in lib/homepage/prompt.ts). */
  system: string;
  model: string;
  maxTokens: number;
};

/** Abort budget for the vision request; matches GENERATE_TIMEOUT_MS in the job. */
export const GENERATE_FETCH_TIMEOUT_MS = 200_000;

export type GenerateHomepageResult = { html: string; critique: string };

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
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.system,
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
  // fails JSON.parse and would be retried several times at full max_tokens each. Fail fast.
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
