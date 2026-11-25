import { z } from "zod";
import type { AgentOutput } from "./apply-result";

const MAX_AGENT_CONTACTS = 10;

const text = z.string().max(500);
const httpsUrl = text.refine((v) => {
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
});
const email = z.email().max(500);

const TARGET_FIELDS: Record<string, z.ZodType<string>> = {
  company_website: httpsUrl,
  industry: text,
  employees: text,
  city: text,
  company_phone: text,
  social_linkedin: httpsUrl,
  social_x: httpsUrl,
  description: text,
};

const value = (schema: z.ZodType<string>, v: unknown): string | null => {
  const r = schema.safeParse(v);
  return r.success ? r.data : null;
};
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/**
 * Parses the enrichment agent's stdout. The agent reads outside web pages, so
 * its output is untrusted: only known fields are kept, each a string of at most
 * 500 characters (links must be https URLs) or null, and at most 10 contacts.
 * Throws when the output is not a JSON object.
 */
export function parseAgentOutput(stdout: string): AgentOutput {
  const raw = z.looseObject({}).parse(JSON.parse(stdout));

  const target: Record<string, string | null> = {};
  for (const [key, v] of Object.entries(record(raw.target))) {
    if (Object.hasOwn(TARGET_FIELDS, key)) target[key] = value(TARGET_FIELDS[key], v);
  }

  const contacts = (Array.isArray(raw.contacts) ? raw.contacts : [])
    .slice(0, MAX_AGENT_CONTACTS)
    .map(record)
    .map((c) => ({
      name: value(text, c.name),
      email: value(email, c.email),
      title: value(text, c.title),
      linkedinUrl: value(httpsUrl, c.linkedinUrl),
      phone: value(text, c.phone),
      source: "enriched",
    }));

  const confidence: Record<string, number> = {};
  for (const [key, v] of Object.entries(record(raw.confidence))) {
    if (typeof v === "number" && v >= 0 && v <= 1) confidence[key] = v;
  }

  return { target, contacts, confidence };
}
