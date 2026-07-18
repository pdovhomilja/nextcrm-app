import { prismadb } from "@/lib/prisma";
import {
  DEFAULT_FUNNEL_SETTINGS,
  type FunnelTimingSettings,
} from "./funnel-timers";

export const RECYCLED_LIST_NAME = "Recycled";
const DAY = 24 * 60 * 60 * 1000;

// Spec §3.3: a target whose sequence finished with no response is paused
// (recycleAfterDays, default 90), then recycled. "Sequence finished" = the
// campaign's max-order step was sent to the target; "no response" = never
// converted (an inbound reply leads to conversion in the runbook flow).
export async function findRecycleCandidates(
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - s.recycleAfterDays * DAY);

  const maxOrders = await prismadb.crm_campaign_steps.groupBy({
    by: ["campaign_id"],
    _max: { order: true },
  });
  const maxOrderByCampaign = new Map(
    maxOrders.map((m) => [m.campaign_id, m._max.order ?? 0]),
  );
  if (maxOrderByCampaign.size === 0) return [];

  const finalSends = await prismadb.crm_campaign_sends.findMany({
    where: { status: "sent", sent_at: { lte: cutoff } },
    select: { target_id: true, campaign_id: true, sent_at: true, step: { select: { order: true } } },
  });

  const finishedTargetIds = Array.from(
    new Set(
      finalSends
        .filter(
          (send) =>
            send.step.order === maxOrderByCampaign.get(send.campaign_id) &&
            send.sent_at != null &&
            new Date(send.sent_at).getTime() <= cutoff.getTime(),
        )
        .map((send) => send.target_id),
    ),
  );
  if (finishedTargetIds.length === 0) return [];

  const eligible = await prismadb.crm_Targets.findMany({
    where: {
      id: { in: finishedTargetIds },
      do_not_email: false,
      converted_at: null,
      deletedAt: null,
      target_lists: { none: { target_list: { name: RECYCLED_LIST_NAME } } },
    },
    select: { id: true },
  });
  return eligible.map((t) => t.id);
}
