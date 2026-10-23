export type ResumeExperience = { company: string; title: string; dates: string };
export type ResumeEducation = { school: string; degree: string; dates: string };

export type ResumeProfile = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
};

const EMPTY: ResumeProfile = {
  fullName: null,
  email: null,
  phone: null,
  location: null,
  headline: null,
  summary: null,
  skills: [],
  experience: [],
  education: [],
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 40);
}

function asExperience(value: unknown): ResumeExperience[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const company = asText(row.company);
      const title = asText(row.title);
      if (!company && !title) return null;
      return { company: company ?? "", title: title ?? "", dates: asText(row.dates) ?? "" };
    })
    .filter((row): row is ResumeExperience => Boolean(row))
    .slice(0, 12);
}

function asEducation(value: unknown): ResumeEducation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const school = asText(row.school);
      const degree = asText(row.degree);
      if (!school && !degree) return null;
      return { school: school ?? "", degree: degree ?? "", dates: asText(row.dates) ?? "" };
    })
    .filter((row): row is ResumeEducation => Boolean(row))
    .slice(0, 8);
}

export function profileFromUnknown(value: unknown): ResumeProfile {
  if (!value || typeof value !== "object") return { ...EMPTY };
  const row = value as Record<string, unknown>;
  return {
    fullName: asText(row.fullName),
    email: asText(row.email)?.toLowerCase() ?? null,
    phone: asText(row.phone),
    location: asText(row.location),
    headline: asText(row.headline),
    summary: asText(row.summary),
    skills: asList(row.skills),
    experience: asExperience(row.experience),
    education: asEducation(row.education),
  };
}

export function parseResumeJson(raw: string): ResumeProfile | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? raw).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return profileFromUnknown(JSON.parse(body.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/** Used when the model is unavailable. Pulls the obvious contact lines from the PDF text. */
export function profileFromPlainText(text: string): ResumeProfile {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  const phone = text.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/)?.[0] ?? null;
  const fullName = lines.find((line) => line.length < 80 && !line.includes("@") && !/\d{3}/.test(line)) ?? null;
  return { ...EMPTY, fullName, email, phone, summary: lines.slice(0, 8).join(" ") || null };
}
