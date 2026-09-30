/**
 * Shared helper for pulling a JSON object out of an LLM text response.
 * Strips ```json fences and slices from the first "{" to the last "}".
 * Used by the homepage provider and the target-email generator.
 */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}
