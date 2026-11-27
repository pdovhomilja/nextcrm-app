/** Account fields a caller may set. A key left out is not touched; null clears it. */
export interface AccountInput {
  name?: string;
  office_phone?: string | null;
  website?: string | null;
  fax?: string | null;
  company_id?: string | null;
  vat?: string | null;
  email?: string | null;
  billing_street?: string | null;
  billing_postal_code?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_country?: string | null;
  shipping_street?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_country?: string | null;
  description?: string | null;
  /** Ignored for a partner: a partner never sets the internal owner. */
  assigned_to?: string | null;
  status?: string | null;
  annual_revenue?: string | null;
  member_of?: string | null;
  /** Ids of an industry and a price list. */
  industry?: string | null;
  pricelist_id?: string | null;
  /** Id of this account's record in another system. */
  external_ref?: string | null;
}

export type AccountCreateInput = AccountInput & { name: string };

/**
 * The keys of AccountInput, as a record so the compiler keeps the two in step. The service copies only
 * these keys from its input, so a caller cannot write the partner, the case-study flags, the owner
 * columns or deletedAt through it; those have writers of their own.
 */
const FIELDS: Record<keyof AccountInput, true> = {
  name: true, office_phone: true, website: true, fax: true, company_id: true, vat: true, email: true,
  billing_street: true, billing_postal_code: true, billing_city: true, billing_state: true, billing_country: true,
  shipping_street: true, shipping_postal_code: true, shipping_city: true, shipping_state: true, shipping_country: true,
  description: true, assigned_to: true, status: true, annual_revenue: true, member_of: true, industry: true,
  pricelist_id: true, external_ref: true,
};
export const ACCOUNT_FIELDS = Object.keys(FIELDS) as (keyof AccountInput)[];

export const ACCOUNT_ERROR_CODES = ["notFound", "forbidden"] as const;
export type AccountErrorCode = (typeof ACCOUNT_ERROR_CODES)[number];

/** Domain error; each caller maps the code to its own response. */
export class AccountError extends Error {
  constructor(public readonly code: AccountErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AccountError";
  }
}

/** The server actions' message for an AccountError: "Price list not found" for a wrong price list id, else "Forbidden". */
export function accountErrorMessage(e: AccountError): string {
  return e.code === "notFound" ? `${e.message} not found` : "Forbidden";
}
