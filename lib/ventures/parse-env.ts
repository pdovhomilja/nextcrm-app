/** Read a single key from dotenv-style text (venture .env blob). */
export function readEnvVarFromContent(content: string, key: string): string | null {
  const entry = parseEnvContent(content).entries.find((e) => e.key === key.trim());
  return entry?.value ?? null;
}

export const VENTURE_PROVISIONING_SECRET_KEY = "VENTURE_PROVISIONING_SECRET";

export type EnvEntry = { key: string; value: string };

const PREFERRED_ENV_KEYS = [
  "VENTURE_PROVISIONING_SECRET",
  "MONGODB_URI",
  "DATABASE_URL",
  "SESSION_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

function unquoteValue(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

/** Split stored .env text into comment lines and key/value entries. */
export function parseEnvContent(content: string): { comments: string[]; entries: EnvEntry[] } {
  const comments: string[] = [];
  const entries: EnvEntry[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) {
      comments.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      comments.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    entries.push({ key, value: unquoteValue(trimmed.slice(eq + 1)) });
  }

  return { comments, entries };
}

/** Merge preferred keys (always listed in UI) with any extra keys from the file. */
export function normalizeEnvEntriesForEditor(
  content: string,
  extraDefaults?: Record<string, string>,
): EnvEntry[] {
  const { entries } = parseEnvContent(content);
  const map = new Map<string, string>();
  for (const e of entries) map.set(e.key, e.value);
  if (extraDefaults) {
    for (const [k, v] of Object.entries(extraDefaults)) {
      if (v && !map.get(k)) map.set(k, v);
    }
  }

  const ordered: EnvEntry[] = [];
  for (const key of PREFERRED_ENV_KEYS) {
    ordered.push({ key, value: map.get(key) ?? "" });
    map.delete(key);
  }
  for (const [key, value] of Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    ordered.push({ key, value });
  }
  return ordered;
}

export function serializeEnvContent(comments: string[], entries: EnvEntry[]): string {
  const lines: string[] = [...comments.filter((c) => c.trim())];
  for (const { key, value } of entries) {
    const k = key.trim();
    if (!k) continue;
    if (!value.trim()) continue;
    const needsQuotes = /[\s#"'\\]/.test(value);
    const v = needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value;
    lines.push(`${k}=${v}`);
  }
  return lines.join("\n");
}

/** Build .env text from editor rows (used on save / seed). */
export function envContentFromEntries(content: string, entries: EnvEntry[]): string {
  const { comments } = parseEnvContent(content);
  return serializeEnvContent(comments, entries);
}
