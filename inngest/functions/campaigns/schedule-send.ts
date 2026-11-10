import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { subscribedTargetsInclude } from "@/lib/campaigns/recipient-filters";
import { campaignSkipReason } from "@/lib/authz/scopes/campaign-not-deleted";
import { markCampaignSentIfStep0Done } from "@/lib/campaigns/mark-campaign-sent";

export const campaignScheduleSend = inngest.createFunction(
  {
    id: "campaign-schedule-send",
    name: "Campaign: Schedule Send",
    triggers: [{ event: "campaigns/schedule" }],
    cancelOn: [
      { event: "campaigns/deleted", match: "data.campaignId" },
      // A reschedule sends campaigns/schedule again: the older sleeping run goes,
      // the new one (started by the same event) stays.
      { event: "campaigns/schedule", match: "data.campaignId" },
      { event: "campaigns/paused", match: "data.campaignId" },
      // Send now already sent it: the run sleeping until the old time must not again.
      { event: "campaigns/send-now", match: "data.campaignId" },
    ],
  },
  async ({ event, step }) => {
    const { campaignId, scheduledAt } = event.data as {
      campaignId: string;
      scheduledAt: string;
    };

    await step.sleepUntil("wait-for-send-time", new Date(scheduledAt));

    const campaign = await step.run("check-campaign-status", async () => {
      return prismadb.crm_campaigns.findUnique({
        where: { id: campaignId },
        select: { status: true, deletedAt: true, target_lists: true },
      });
    });

    const skipReason = campaign && campaignSkipReason(campaign);
    if (!campaign || skipReason) {
      return { skipped: true, reason: skipReason ?? campaign?.status };
    }

    // Get step 0
    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({
        where: { campaign_id: campaignId, order: 0 },
      });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    // Only a campaign still "scheduled" goes out. One already sent early (send now)
    // is skipped even if the cancel event was missed. Conditional write, like the
    // send-now claim, inside a step so a replay keeps the first result.
    const claimed = await step.run("claim-campaign", async () => {
      const { count } = await prismadb.crm_campaigns.updateMany({
        where: { id: campaignId, status: "scheduled", deletedAt: null },
        data: { status: "sending" },
      });
      return count > 0;
    });
    if (!claimed) return { skipped: true, reason: campaign.status };

    // Resolve recipients (deduplicated by email)
    const targets = await step.run("resolve-recipients", async () => {
      const lists = await prismadb.crm_TargetLists.findMany({
        where: {
          campaign_lists: { some: { campaign_id: campaignId } },
        },
        include: subscribedTargetsInclude(),
      });

      const seen = new Set<string>();
      const unique: Array<{ id: string; email: string }> = [];
      for (const list of lists) {
        for (const t of list.targets) {
          if (t.target.email && !seen.has(t.target.email)) {
            seen.add(t.target.email);
            unique.push({ id: t.target.id, email: t.target.email });
          }
        }
      }
      return unique;
    });

    // Create send records (idempotent via skipDuplicates)
    const sendRecords = await step.run("create-send-records", async () => {
      await prismadb.crm_campaign_sends.createMany({
        data: targets.map((t) => ({
          campaign_id: campaignId,
          step_id: step0.id,
          target_id: t.id,
          email: t.email,
          unsubscribe_token: randomUUID(),
        })),
        skipDuplicates: true,
      });
      return prismadb.crm_campaign_sends.findMany({
        where: { step_id: step0.id },
        select: { id: true, target_id: true, email: true, unsubscribe_token: true },
      });
    });

    // Fan-out send events
    await step.sendEvent(
      "fan-out-sends",
      sendRecords.map((s) => ({
        name: "campaigns/send-step" as const,
        data: { sendId: s.id, campaignId },
      }))
    );

    // Schedule follow-up steps
    const followUpSteps = await step.run("get-follow-up-steps", async () => {
      return prismadb.crm_campaign_steps.findMany({
        where: { campaign_id: campaignId, order: { gt: 0 } },
        orderBy: { order: "asc" },
      });
    });

    if (followUpSteps.length > 0) {
      await step.sendEvent(
        "schedule-follow-ups",
        followUpSteps.map((s) => ({
          name: "campaigns/follow-up" as const,
          data: {
            campaignId,
            stepId: s.id,
            scheduledAt: new Date(new Date(scheduledAt).getTime() + s.delay_days * 86_400_000).toISOString(),
          },
        }))
      );
    }

    // With no recipients no send-step runs, so nothing else would finish the campaign.
    await step.run("mark-campaign-sent", () => markCampaignSentIfStep0Done(campaignId));

    return { dispatched: sendRecords.length };
  }
);
