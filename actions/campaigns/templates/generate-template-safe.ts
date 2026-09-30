"use server";
import { generateTemplate } from "./generate-template";

/**
 * Fork-owned safe wrapper around the upstream `generateTemplate` server action.
 *
 * Why: `generateTemplate` THROWS on any failure (OpenAI 429/401, timeout, bad
 * JSON, no key). A server action that throws has its error message REDACTED by
 * Next.js in production — the client only sees "An error occurred in the Server
 * Components render … a digest property is included", which surfaced to users as a
 * crash instead of a useful message. Returned values are NOT redacted, so this
 * wrapper catches the (real, server-side) error and RETURNS a friendly message.
 *
 * Additive-first: the upstream action + its tests stay untouched; only the caller
 * (TemplateEditorForm) is repointed here. See docs/reference/UPSTREAM_IMPACT_LOG.md.
 */
export type GenerateTemplateResult =
  | { data: { html: string; json: object; subject: string } }
  | { error: string };

/** Map the upstream thrown Error to a friendly, user-facing message. */
function friendlyMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);

  if (name === "AbortError") return "The AI request timed out. Please try again.";
  if (/No OpenAI API key/i.test(msg)) return msg; // already actionable
  if (msg === "Unauthorized") return "Your session expired. Please sign in again.";

  // Upstream throws `OpenAI error: <statusText>` for a non-OK response.
  if (/OpenAI error:/i.test(msg)) {
    if (/too many requests/i.test(msg))
      return "OpenAI is rate-limiting requests right now. Wait a moment and try again.";
    if (/unauthorized|forbidden/i.test(msg))
      return "OpenAI rejected the API key. Check it in Profile → LLMs.";
    return "The AI service returned an error. Please try again in a moment.";
  }
  if (/JSON|Unexpected token/i.test(msg))
    return "The AI returned an unexpected response. Please try again.";
  return "AI generation failed. Please try again.";
}

export const generateTemplateSafe = async (prompt: string): Promise<GenerateTemplateResult> => {
  try {
    const data = await generateTemplate(prompt);
    return { data };
  } catch (err) {
    return { error: friendlyMessage(err) };
  }
};
