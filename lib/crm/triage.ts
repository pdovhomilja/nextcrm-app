import type { crm_Pass_Reason } from "@prisma/client";

export const TRIAGE_DECISIONS = ["APPROVED", "PASSED"] as const;
export type TriageDecision = (typeof TRIAGE_DECISIONS)[number];

// Thrown for invalid triage input so each caller can translate it: the web
// action returns { error }, the MCP tool lets it propagate.
export class TriageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TriageValidationError";
  }
}

interface BuildTriageInput {
  status: string;
  pass_reason?: string | null;
  pass_note?: string | null;
  revisit_at?: Date | string | null;
  userId: string;
}

// Single source of truth for the triage write shape, shared by the server
// action and the MCP tool so they can't drift. APPROVED clears any prior pass
// metadata; PASSED records the reason (required), optional note, and an
// optional revisit date to resurface later.
export function buildTriageData(input: BuildTriageInput) {
  const { status, pass_reason, pass_note, revisit_at, userId } = input;

  if (status !== "APPROVED" && status !== "PASSED") {
    throw new TriageValidationError("status must be APPROVED or PASSED");
  }
  if (status === "PASSED" && !pass_reason) {
    throw new TriageValidationError("pass_reason is required when passing a target");
  }

  const decision =
    status === "APPROVED"
      ? {
          triage_status: "APPROVED" as const,
          pass_reason: null,
          pass_note: null,
          revisit_at: null,
        }
      : {
          triage_status: "PASSED" as const,
          pass_reason: (pass_reason ?? null) as crm_Pass_Reason | null,
          pass_note: pass_note ?? null,
          revisit_at: revisit_at ? new Date(revisit_at) : null,
        };

  return { ...decision, triaged_at: new Date(), triaged_by: userId };
}
