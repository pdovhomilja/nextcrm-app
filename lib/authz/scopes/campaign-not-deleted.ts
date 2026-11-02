import type { Prisma } from "@prisma/client";

// Campaigns have two delete markers: the campaigns UI sets status "deleted",
// the MCP tools set deletedAt. status is nullable, and Prisma's `not` would
// drop NULL rows, hence the OR. Use inside AND so it can't clash with a scope.
// Kept free of runtime imports: client components reach it through
// actions/reports/types.ts.
export const CAMPAIGN_NOT_DELETED: Prisma.crm_campaignsWhereInput = {
  deletedAt: null,
  OR: [{ status: null }, { status: { not: "deleted" } }],
};

// Same rule for the campaign send jobs (Inngest), which load one campaign
// instead of querying. deletedAt is a string when it comes back from step.run.
export function campaignSkipReason(campaign: {
  status: string | null;
  deletedAt: Date | string | null;
}): "paused" | "deleted" | null {
  if (campaign.status === "deleted" || campaign.deletedAt) return "deleted";
  if (campaign.status === "paused") return "paused";
  return null;
}
