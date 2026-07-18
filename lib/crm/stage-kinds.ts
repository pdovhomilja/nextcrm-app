// Automation trigger kinds connectable to sales stages in admin CRM
// settings. Lives outside the "use server" actions file (whose exports
// must all be async functions) so both server and client code can import.
export const STAGE_KINDS = [
  "pre_sale",
  "qualified",
  "purchase_order",
  "delivery",
  "care",
] as const;

export type StageKind = (typeof STAGE_KINDS)[number];
