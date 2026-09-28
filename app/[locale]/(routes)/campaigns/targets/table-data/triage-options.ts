// Shared triage option lists + label/badge helpers, reused by the targets
// table column, faceted filter, and the Approve/Pass row action.

export const TRIAGE_STATUS_OPTIONS = [
  { label: "New", value: "NEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Passed", value: "PASSED" },
] as const;

export const PASS_REASON_OPTIONS = [
  { label: "Scope too large", value: "SCOPE_TOO_LARGE" },
  { label: "Not a fit", value: "NOT_A_FIT" },
  { label: "Bad timing", value: "BAD_TIMING" },
  { label: "Already modern", value: "ALREADY_MODERN" },
  { label: "Other", value: "OTHER" },
] as const;

export type TriageStatus = (typeof TRIAGE_STATUS_OPTIONS)[number]["value"];
export type PassReason = (typeof PASS_REASON_OPTIONS)[number]["value"];

export function triageStatusLabel(value?: string | null): string {
  return TRIAGE_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "New";
}

export function passReasonLabel(value?: string | null): string {
  return PASS_REASON_OPTIONS.find((o) => o.value === value)?.label ?? "";
}

// Badge variant per triage status. `secondary` = NEW (neutral), `default` =
// APPROVED (highlighted), `outline` = PASSED (muted).
export function triageBadgeVariant(
  value?: string | null
): "default" | "secondary" | "outline" {
  if (value === "APPROVED") return "default";
  if (value === "PASSED") return "outline";
  return "secondary";
}
