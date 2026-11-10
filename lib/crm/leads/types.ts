/** Lead fields a caller may set. A key left out is not touched; null clears it. */
export interface LeadInput {
  firstName?: string | null;
  lastName?: string;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  lead_source_id?: string | null;
  lead_status_id?: string | null;
  lead_type_id?: string | null;
  refered_by?: string | null;
  campaign?: string | null;
  assigned_to?: string | null;
  accountsIDs?: string | null;
}

export type LeadCreateInput = LeadInput & { lastName: string };

export const LEAD_ERROR_CODES = ["notFound", "forbidden"] as const;
export type LeadErrorCode = (typeof LEAD_ERROR_CODES)[number];

/** Domain error; each caller maps the code to its own response. */
export class LeadError extends Error {
  constructor(public readonly code: LeadErrorCode, message?: string) {
    super(message ?? code);
    this.name = "LeadError";
  }
}

/** The server actions' message for a LeadError: "Lead status not found" for a wrong lookup id, else "Forbidden". */
export function leadErrorMessage(e: LeadError): string {
  return e.code === "notFound" ? `${e.message} not found` : "Forbidden";
}
