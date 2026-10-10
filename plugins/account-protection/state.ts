import type { Settings } from "./settings";

const DAY = 86_400_000;

export interface Registration {
  key: string;
  ownerId: string;
  registeredAt: string;
  contactDeadline: string;
  protectedUntil: string;
  contactAt?: string;
  /** The registration's own window (registeredAt + protectionDays); missing on 0.1.x records → protectedUntil. */
  baseUntil?: string;
  /** orderDate (ISO day) of the newest qualifying order. */
  lastOrderAt?: string;
}

export const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function newRegistration(key: string, ownerId: string, at: Date, s: Pick<Settings, "protectionDays" | "contactDays">): Registration {
  const contactDays = Math.min(s.contactDays, s.protectionDays);   // Ruling 5
  const protectedUntil = new Date(at.getTime() + s.protectionDays * DAY).toISOString();
  return {
    key,
    ownerId,
    registeredAt: at.toISOString(),
    contactDeadline: new Date(at.getTime() + contactDays * DAY).toISOString(),
    protectedUntil,
    baseUntil: protectedUntil,
  };
}

/** UTC midnight of `day` plus whole calendar months; the 31st becomes the month's last day. */
export function addMonthsUtc(day: string, months: number): Date {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)));
}

/**
 * Rule 3 (spec § 3.2): protection runs at least `orderMonths` from the newest qualifying order and never below
 * the registration's own window; an order dated on or after the registration day counts as contact (rule 2).
 */
export function withOrders(reg: Registration, lastOrderDay: string | null, orderMonths: number): Registration {
  const baseUntil = reg.baseUntil ?? reg.protectedUntil;
  const fromOrder = lastOrderDay && orderMonths > 0 ? addMonthsUtc(lastOrderDay, orderMonths).toISOString() : null;
  const next: Registration = { ...reg, baseUntil, protectedUntil: fromOrder && fromOrder > baseUntil ? fromOrder : baseUntil };
  if (lastOrderDay) next.lastOrderAt = lastOrderDay;
  else delete next.lastOrderAt;
  if (!next.contactAt && lastOrderDay && lastOrderDay >= isoDay(reg.registeredAt)) next.contactAt = `${lastOrderDay}T00:00:00.000Z`;
  return next;
}

/** Contact counts from the start of the registration day (spec §2: "on or after the registration date"). */
export const contactSince = (r: Registration) => new Date(`${isoDay(r.registeredAt)}T00:00:00.000Z`);

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
