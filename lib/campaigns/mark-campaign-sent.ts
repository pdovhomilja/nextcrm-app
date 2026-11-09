import { prismadb } from "@/lib/prisma";

// A campaign is "sent" once step 0 is finished: no step-0 send is still
// waiting to go out (queued, or sending: claimed by a run, mail in flight). A
// queued send to a recipient who unsubscribed or is globally suppressed is not
// waiting: send-step skips it and leaves it queued (sendStepSkipReason), so it
// would otherwise block the campaign forever.
// sent / delivered / bounced / failed all count as finished.
// Conditional write: only a "sending" campaign moves, so concurrent send-steps
// are idempotent and a paused or deleted campaign is never overwritten.
export async function markCampaignSentIfStep0Done(campaignId: string) {
  const waiting = await prismadb.crm_campaign_sends.count({
    where: {
      campaign_id: campaignId,
      step: { order: 0 },
      status: { in: ["queued", "sending"] },
      unsubscribed_at: null,
      target: { do_not_email: false },
    },
  });
  if (waiting > 0) return { marked: false };
  const { count } = await prismadb.crm_campaigns.updateMany({
    where: { id: campaignId, status: "sending", deletedAt: null },
    data: { status: "sent", sent_at: new Date() },
  });
  return { marked: count > 0 };
}
