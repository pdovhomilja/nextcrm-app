import type { OxoCustomer } from "./oxo";

/** Spec § 3.2: a row OXO ERP mirrors from Odoo keeps the Odoo id, so it lands on the row odoo-connector made. */
export const ref = (row: { id: number; odooId: number | null }) => (row.odooId != null ? String(row.odooId) : `oxo:${row.id}`);

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// Odoo's names that Intl does not use.
const ALIASES: Record<string, string> = { "czech republic": "CZ", "slovak republic": "SK", "russian federation": "RU", "united states of america": "US", "korea, republic of": "KR" };
let byName: Map<string, string> | null = null;

/** OXO ERP sends Odoo's English country name; the CRM keeps ISO codes. Unknown names give null. */
export function countryCode(name: string | null): string | null {
  if (!name) return null;
  if (!byName) {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    byName = new Map(Object.entries(ALIASES));
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const n = dn.of(code);
      if (n && n !== code) byName.set(n.toLowerCase(), code);
    }
  }
  return byName.get(name.trim().toLowerCase()) ?? null;
}
export const countryName = (code: string | null) => (code ? new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? null : null);

/** Spec § 4.1: the account fields OXO ERP controls. billing_country is null when OXO ERP has none or an unknown name. */
export function accountFields(c: OxoCustomer) {
  return {
    name: str(c.name) ?? `OXO ERP #${c.id}`,
    company_id: str(c.ico),
    vat: str(c.dic),
    billing_street: str(c.street),
    billing_city: str(c.city),
    billing_postal_code: str(c.zip),
    billing_country: countryCode(c.country),
    email: str(c.email),
    office_phone: str(c.phone),
  };
}
export type AccountFields = ReturnType<typeof accountFields>;

/** Only the keys whose value differs; an empty OXO ERP value never clears a filled CRM value. */
export function changedFields<T extends Record<string, unknown>>(current: Record<string, unknown>, next: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v != null && (current[k] ?? null) !== v)) as Partial<T>;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const zipNorm = (v: unknown) => String(v ?? "").replace(/\s+/g, "");
type Place = { street: unknown; city: unknown; zip: unknown };
export const sameAddress = (a: Place, b: Place) => norm(a.street) === norm(b.street) && norm(a.city) === norm(b.city) && zipNorm(a.zip) === zipNorm(b.zip);
