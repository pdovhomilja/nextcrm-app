/** Contact fields a caller may set. A key left out is not touched; null clears it. */
export interface ContactInput {
  first_name?: string | null;
  last_name?: string;
  email?: string | null;
  personal_email?: string | null;
  office_phone?: string | null;
  mobile_phone?: string | null;
  website?: string | null;
  position?: string | null;
  description?: string | null;
  status?: boolean;
  /** "day/month/year", as the contact form builds it. */
  birthday?: string | null;
  social_twitter?: string | null;
  social_facebook?: string | null;
  social_linkedin?: string | null;
  social_skype?: string | null;
  social_instagram?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  /** Id of a contact type. */
  contact_type_id?: string | null;
  /** Ignored for a partner: a partner's contacts are assigned to that partner. */
  assigned_to?: string | null;
  /** The linked account (crm_Contacts.assigned_accounts); null unlinks. A partner never unlinks. */
  accountsIDs?: string | null;
}

export type ContactCreateInput = ContactInput & { last_name: string };

/**
 * The keys of ContactInput, as a record so the compiler keeps the two in step. The service copies only
 * these keys from its input, so a caller cannot write the owner columns, deletedAt, tags, notes or a
 * relation through it.
 */
const FIELDS: Record<keyof ContactInput, true> = {
  first_name: true, last_name: true, email: true, personal_email: true, office_phone: true, mobile_phone: true,
  website: true, position: true, description: true, status: true, birthday: true,
  social_twitter: true, social_facebook: true, social_linkedin: true, social_skype: true, social_instagram: true,
  social_youtube: true, social_tiktok: true, contact_type_id: true, assigned_to: true, accountsIDs: true,
};
export const CONTACT_FIELDS = Object.keys(FIELDS) as (keyof ContactInput)[];

/** What the enrichment PATCH route may write: text columns only, never the owner or the account link. */
export type ContactEnrichmentInput = Partial<
  Record<
    | "position" | "website" | "description" | "office_phone" | "mobile_phone"
    | "social_linkedin" | "social_twitter" | "social_facebook" | "social_instagram",
    string
  >
>;
const ENRICHMENT_FIELDS: Record<keyof ContactEnrichmentInput, true> = {
  position: true, website: true, description: true, office_phone: true, mobile_phone: true,
  social_linkedin: true, social_twitter: true, social_facebook: true, social_instagram: true,
};
export const CONTACT_ENRICHMENT_FIELDS = Object.keys(ENRICHMENT_FIELDS) as (keyof ContactEnrichmentInput)[];

/** A contact from the create-from-remote route (NEXTCRM_TOKEN): no signed-in user. */
export interface RemoteContactInput {
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  tags: string[];
  notes: string[];
}

export const CONTACT_ERROR_CODES = ["notFound", "forbidden"] as const;
export type ContactErrorCode = (typeof CONTACT_ERROR_CODES)[number];

/** Domain error; each caller maps the code to its own response. */
export class ContactError extends Error {
  constructor(public readonly code: ContactErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ContactError";
  }
}

/** The server actions' message for a ContactError: "<what> not found" for notFound, else "Forbidden". */
export function contactErrorMessage(e: ContactError): string {
  return e.code === "notFound" ? `${e.message} not found` : "Forbidden";
}
