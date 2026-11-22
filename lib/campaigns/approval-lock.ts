import type { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/authz/roles";
import type { AuthzUser } from "@/lib/authz/session";

// Scheduling and sending need a manager or admin, so scheduling is the
// approval step. While a campaign is scheduled or sending, only a manager or
// admin may change what it sends: the campaign, its steps, the templates it
// uses and its target lists. Paused campaigns stay editable: resuming or
// rescheduling them needs a manager again.
export const LOCKED_CAMPAIGN_STATUSES = ["scheduled", "sending"];
export const CAMPAIGN_LOCKED_MESSAGE =
  "Used by a scheduled or sending campaign: only a manager or admin can change it";

export class CampaignLockedError extends Error {
  constructor() {
    super(CAMPAIGN_LOCKED_MESSAGE);
    this.name = "CampaignLockedError";
  }
}

async function assertNoLockedCampaign(user: AuthzUser, where: Prisma.crm_campaignsWhereInput) {
  if (isManagerOrAdmin(user)) return;
  const locked = await prismadb.crm_campaigns.count({
    where: { AND: [where, { status: { in: LOCKED_CAMPAIGN_STATUSES }, deletedAt: null }] },
  });
  if (locked > 0) throw new CampaignLockedError();
}

export const assertCampaignEditable = (user: AuthzUser, campaignId: string) =>
  assertNoLockedCampaign(user, { id: campaignId });

export const assertTemplateEditable = (user: AuthzUser, templateId: string) =>
  assertNoLockedCampaign(user, { OR: [{ template_id: templateId }, { steps: { some: { template_id: templateId } } }] });

export const assertTargetListEditable = (user: AuthzUser, targetListId: string) =>
  assertNoLockedCampaign(user, { target_lists: { some: { target_list_id: targetListId } } });
