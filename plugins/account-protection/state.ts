import type { Settings } from "./settings";

const DAY = 86_400_000;

export interface Registration {
  key: string;
  ownerId: string;
  registeredAt: string;
  contactDeadline: string;
  protectedUntil: string;
  contactAt?: string;
}

export const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function newRegistration(key: string, ownerId: string, at: Date, s: Pick<Settings, "protectionDays" | "contactDays">): Registration {
  const contactDays = Math.min(s.contactDays, s.protectionDays);   // Ruling 5
  return {
    key,
    ownerId,
    registeredAt: at.toISOString(),
    contactDeadline: new Date(at.getTime() + contactDays * DAY).toISOString(),
    protectedUntil: new Date(at.getTime() + s.protectionDays * DAY).toISOString(),
  };
}

export function dueDay(r: Registration): string {
  return isoDay(!r.contactAt && r.contactDeadline < r.protectedUntil ? r.contactDeadline : r.protectedUntil);
}

export type Verdict = "keep" | "check-contact" | "expired";

export function evaluate(r: Registration, now: Date): Verdict {
  if (now.getTime() >= Date.parse(r.protectedUntil)) return "expired";
  if (!r.contactAt && now.getTime() >= Date.parse(r.contactDeadline)) return "check-contact";
  return "keep";
}

export type Summary =
  | { kind: "noNumber" }
  | { kind: "free" }
  | { kind: "contactNeeded"; date: string }
  | { kind: "protected"; date: string };

export function summarize(hasKey: boolean, reg: Registration | null, contactAt: string | null): Summary {
  if (!hasKey) return { kind: "noNumber" };
  if (!reg) return { kind: "free" };
  if (!contactAt && reg.contactDeadline < reg.protectedUntil) return { kind: "contactNeeded", date: reg.contactDeadline };
  return { kind: "protected", date: reg.protectedUntil };
}

const INTL_LOCALE: Record<string, string> = { en: "en-GB", cz: "cs", de: "de", uk: "uk" };

export function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-GB", { day: "numeric", month: locale === "cz" ? "numeric" : "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso));
}
