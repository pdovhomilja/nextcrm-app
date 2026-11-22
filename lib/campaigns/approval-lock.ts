import type { Prisma } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/authz/roles";
import type { AuthzUser } from "@/lib/authz/session";

// Scheduling and sending need a manager or admin, so scheduling is the
// approval step. While a campaign is scheduled, sending or paused, only a manager or
// admin may change what it sends: the campaign, its steps, the templates it
// uses, its target lists and the target fields a send reads. One entry per
// locked status.
export const LOCKED_CAMPAIGN_STATUSES = [
  "scheduled",
  "sending",
  "paused",
] as const satisfies readonly string[];

// What a send reads from a target: the address and the merge tags
// (lib/campaigns/merge-tags.ts).
const SENT_TARGET_FIELDS = ["email", "first_name", "last_name", "company", "position"] as const;
export const CAMPAIGN_LOCKED_MESSAGE =
  "Used by a scheduled, sending or paused campaign: only a manager or admin can change it";

export class CampaignLockedError extends Error {
  constructor() {
    super(CAMPAIGN_LOCKED_MESSAGE);
    this.name = "CampaignLockedError";
  }
}

async function assertNoLockedCampaign(user: AuthzUser, where: Prisma.crm_campaignsWhereInput) {
  if (isManagerOrAdmin(user)) return;
  const locked = await prismadb.crm_campaigns.count({
    where: { AND: [where, { status: { in: [...LOCKED_CAMPAIGN_STATUSES] }, deletedAt: null }] },
  });
  if (locked > 0) throw new CampaignLockedError();
}

export const assertCampaignEditable = (user: AuthzUser, campaignId: string) =>
  assertNoLockedCampaign(user, { id: campaignId });

export const assertTemplateEditable = (user: AuthzUser, templateId: string) =>
  assertNoLockedCampaign(user, { OR: [{ template_id: templateId }, { steps: { some: { template_id: templateId } } }] });

export const assertTargetListEditable = (user: AuthzUser, targetListId: string) =>
  assertNoLockedCampaign(user, { target_lists: { some: { target_list_id: targetListId } } });

// A change to a field a send reads, on a target in a list of a locked campaign.
// Fields resent with their stored value are not a change.
export async function assertTargetEditable(user: AuthzUser, targetId: string, changes: Record<string, unknown>) {
  if (isManagerOrAdmin(user)) return;
  const current = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    select: { email: true, first_name: true, last_name: true, company: true, position: true },
  });
  if (!current) return;
  const touched = SENT_TARGET_FIELDS.some((f) => changes[f] !== undefined && changes[f] !== current[f]);
  if (!touched) return;
  await assertNoLockedCampaign(user, {
    target_lists: { some: { target_list: { targets: { some: { target_id: targetId } } } } },
  });
}
