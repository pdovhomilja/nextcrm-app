/**
 * Shared helper for pulling a JSON object out of an LLM text response.
 * Strips ```json fences and slices from the first "{" to the last "}".
 * (Duplicated from the private copy in actions/crm/targets/generate-target-email.ts,
 * which is upstream-adjacent shipped code and intentionally left untouched.)
 */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}
