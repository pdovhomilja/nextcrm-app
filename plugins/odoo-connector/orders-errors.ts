import { OdooAuthError, OdooError } from "./odoo";

/** A failure that no retry can fix (spec § 4.2 checks): the order goes to SYNC_FAILED at once. */
export class FinalError extends Error {
  constructor(message: string) { super(message); this.name = "FinalError"; }
}

/** Spec § 5: unreachable never counts; denied pauses everything; refused counts against the order. */
export function failKind(e: unknown): "unreachable" | "denied" | "refused" {
  if (e instanceof OdooAuthError) return "denied";
  if (e instanceof OdooError) {
    if (e.status === 403) return "denied";
    if (e.status === 0 || e.status === 429 || e.status >= 500) return "unreachable";
  }
  return "refused";
}
