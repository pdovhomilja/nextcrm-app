/** Opportunity fields a caller may set. A key left out is not touched; null clears it. */
export interface OpportunityInput {
  name?: string | null;
  description?: string | null;
  close_date?: Date | null;
  delivery_deadline?: Date | null;
  budget?: number;
  expected_revenue?: number;
  currency?: string | null;
  next_step?: string | null;
  /** Ids of the admin-managed lookup rows. */
  sales_stage?: string | null;
  type?: string | null;
  account?: string | null;
  contact?: string | null;
  campaign?: string | null;
  assigned_to?: string | null;
  /** The web form sends ACTIVE on every save. Otherwise only a stage move sets ACTIVE. */
  status?: "ACTIVE";
}

export type OpportunityCreateInput = Omit<OpportunityInput, "status"> & { name: string };

export const OPPORTUNITY_ERROR_CODES = ["notFound", "forbidden", "blocked"] as const;
export type OpportunityErrorCode = (typeof OPPORTUNITY_ERROR_CODES)[number];

/** Domain error; each caller maps the code to its own response. "blocked" carries the approval gate's reason. */
export class OpportunityError extends Error {
  constructor(public readonly code: OpportunityErrorCode, message?: string) {
    super(message ?? code);
    this.name = "OpportunityError";
  }
}

/** The server actions' message: "Account not found" for a missing row, the gate's reason when blocked, else "Forbidden". */
export function opportunityErrorMessage(e: OpportunityError): string {
  if (e.code === "notFound") return `${e.message} not found`;
  if (e.code === "blocked") return e.message;
  return "Forbidden";
}
