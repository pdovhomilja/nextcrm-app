export type M2O = [number, string] | false;

export interface OdooPartner {
  id: number;
  name: string;
  is_company?: boolean;
  company_registry?: string | false;
  vat?: string | false;
  street?: string | false;
  street2?: string | false;
  city?: string | false;
  zip?: string | false;
  state_id?: M2O;
  country_id?: M2O;
  email?: string | false;
  phone?: string | false;
  mobile?: string | false;
  function?: string | false;
  user_id?: M2O;
  parent_id?: M2O;
  type?: string;
  active?: boolean;
  customer_rank?: number;
  write_date: string;
}

/** Wanted fields; the sync keeps only those this Odoo has (Ruling 3). */
export const PARTNER_FIELDS = [
  "id", "name", "is_company", "company_registry", "vat", "street", "street2", "city", "zip", "state_id", "country_id",
  "email", "phone", "mobile", "function", "user_id", "parent_id", "type", "active", "customer_rank", "write_date",
];

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Spec § 3.4: the synced account fields; Odoo wins for these and only these. */
export function accountFields(p: OdooPartner, countryCode: (id: number) => string | null, defaultCountry: string) {
  return {
    name: str(p.name) ?? `Odoo #${p.id}`,
    company_id: str(p.company_registry),
    vat: str(p.vat),
    billing_street: [str(p.street), str(p.street2)].filter(Boolean).join(", ") || null,
    billing_city: str(p.city),
    billing_postal_code: str(p.zip),
    billing_state: p.state_id ? p.state_id[1] : null,
    billing_country: (p.country_id ? countryCode(p.country_id[0]) : null) ?? defaultCountry,
    email: str(p.email),
    office_phone: str(p.phone) ?? str(p.mobile),
  };
}
export type AccountFields = ReturnType<typeof accountFields>;

export function splitName(name: string): { first_name: string | null; last_name: string } {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() ?? "";
  return { first_name: parts.join(" ") || null, last_name: last };
}

/** Spec § 3.5. */
export function contactFields(p: OdooPartner) {
  return {
    ...splitName(str(p.name) ?? `Odoo #${p.id}`),
    email: str(p.email),
    office_phone: str(p.phone),
    mobile_phone: str(p.mobile),
    position: str(p.function),
  };
}
export type ContactFields = ReturnType<typeof contactFields>;

/**
 * Only the keys whose value differs from the stored row. An empty Odoo value never clears a filled CRM value
 * (Pavel 2026-10-10): Odoo wins only where it has something.
 */
export function changedFields<T extends Record<string, unknown>>(current: Record<string, unknown>, next: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v != null && (current[k] ?? null) !== v)) as Partial<T>;
}
