/** Pull JSON object from model output (handles optional ```json fences). */
export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  return JSON.parse(candidate) as T;
}
