import type { z } from "zod";
import { decrypt, encrypt } from "@/lib/email-crypto";

export interface SettingsField {
  key: string;
  kind: "string" | "number" | "boolean" | "enum";
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
}

type Def = { type: string; innerType?: any; defaultValue?: unknown; entries?: Record<string, string> };
const def = (s: any): Def => s._zod.def;

export function describeSettingsSchema(schema: z.ZodObject<any>): SettingsField[] {
  return Object.entries(schema.shape).map(([key, raw]) => {
    let s: any = raw;
    let required = true;
    let defaultValue: unknown;
    let hasDefault = false;
    while (def(s).type === "optional" || def(s).type === "default") {
      if (def(s).type === "default") { defaultValue = def(s).defaultValue; hasDefault = true; }
      required = false;
      s = def(s).innerType;
    }
    const t = def(s).type;
    const field: SettingsField = { key, kind: "string", required };
    if (t === "string" || t === "number" || t === "boolean") field.kind = t;
    else if (t === "enum") { field.kind = "enum"; field.options = Object.values(def(s).entries ?? {}); }
    else throw new Error(`Unsupported settings field type: ${t} (${key})`);
    if (hasDefault) field.defaultValue = defaultValue;
    return field;
  });
}

export function parseStoredSettings(
  schema: z.ZodObject<any>,
  stored: unknown,
  onWarn: (message: string, context: Record<string, unknown>) => void,
): Record<string, unknown> {
  const input = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const invalid: string[] = [];
  for (const [key, fieldSchema] of Object.entries(schema.shape) as [string, z.ZodType][]) {
    const res = fieldSchema.safeParse(input[key]);
    if (res.success) { out[key] = res.data; continue; }
    const fallback = fieldSchema.safeParse(undefined);
    if (fallback.success) out[key] = fallback.data;
    if (input[key] !== undefined) invalid.push(key);
  }
  if (invalid.length) onWarn(`Stored settings invalid; using defaults for: ${invalid.join(", ")}`, { fields: invalid });
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

export function encryptSecrets(values: Record<string, unknown>): string | null {
  return Object.keys(values).length ? encrypt(JSON.stringify(values)) : null;
}

// Undecryptable secrets (e.g. after an encryption key change) are treated as not set, so the plugin and its admin page keep working.
export function decryptSecrets(cipher: string | null, onError?: (message: string) => void): Record<string, unknown> {
  if (!cipher) return {};
  try {
    return JSON.parse(decrypt(cipher)) as Record<string, unknown>;
  } catch {
    onError?.("Secrets could not be decrypted (encryption key changed?); treating them as not set. Re-enter them in plugin settings.");
    return {};
  }
}
