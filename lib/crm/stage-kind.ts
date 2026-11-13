// Pure stage-kind helpers, safe to import from client components.

type StageLike = { stage_kind?: string | null } | null | undefined;

/** A "qualified" stage needs an approved quote to enter (lib/crm/approval-gate.ts). */
export function isQualifiedStage(stage: StageLike): boolean {
  return stage?.stage_kind === "qualified";
}

/**
 * The stages a new deal may start in. A new deal has no approved quote, so the
 * approval gate refuses every qualified stage on create; the create UI does not
 * offer them.
 */
export function stagesOpenForCreate<T extends { stage_kind?: string | null }>(stages: T[]): T[] {
  return stages.filter((stage) => !isQualifiedStage(stage));
}
