/** Extract a JSON object substring from model output (markdown fences, preamble, etc.). */
export function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  const end = trimmed.lastIndexOf("}");
  if (end > start) return trimmed.slice(start, end + 1);
  return trimmed.slice(start);
}

/** Pull JSON object from model output (handles optional ```json fences and extra prose). */
export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  const candidate = extractJsonCandidate(raw);
  return JSON.parse(candidate) as T;
}

export type CampaignEmailJson = { subject: string; html: string };

/** Parse campaign `{ subject, html }` with a plain-text / HTML fallback when JSON is missing. */
export function parseCampaignEmailJson(raw: string, promptFallback: string): CampaignEmailJson {
  try {
    const parsed = parseJsonObject<{ subject?: string; html?: string }>(raw);
    const html = (parsed.html ?? "").trim();
    const subject = (parsed.subject ?? "").trim();
    if (html) return { subject, html };
  } catch {
    /* try fallback below */
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty model response");
  }

  const subjectFromLine = trimmed.match(/^subject:\s*(.+)$/im)?.[1]?.trim();
  const body = trimmed
    .replace(/^```[\s\S]*?```/gm, "")
    .replace(/^subject:\s*.+$/im, "")
    .trim();

  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = body.includes("<p") || body.includes("<div")
    ? body
    : escaped
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");

  return {
    subject: subjectFromLine || promptFallback.slice(0, 120) || "Campaign email",
    html,
  };
}
