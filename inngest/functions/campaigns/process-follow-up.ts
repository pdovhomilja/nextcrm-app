import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const campaignProcessFollowUp = inngest.createFunction(
  {
    id: "campaign-process-follow-up",
    name: "Campaign: Process Follow-up",
    triggers: [{ event: "campaigns/follow-up" }],
  },
  async ({ event, step }) => {
    const { campaignId, stepId, scheduledAt } = event.data as {
      campaignId: string;
      stepId: string;
      scheduledAt: string;
    };

    await step.sleepUntil("wait-for-follow-up-time", new Date(scheduledAt));

    const [campaign, followUpStep] = await step.run("load-step", async () => {
      return Promise.all([
        prismadb.crm_campaigns.findUnique({ where: { id: campaignId }, select: { status: true } }),
        prismadb.crm_campaign_steps.findUnique({ where: { id: stepId } }),
      ]);
    });

    if (!campaign || campaign.status === "paused" || !followUpStep) {
      return { skipped: true, reason: campaign?.status };
    }

    // Get step 0 to determine eligible recipients
    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({ where: { campaign_id: campaignId, order: 0 } });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    const eligibleTargets = await step.run("filter-recipients", async () => {
      return prismadb.crm_campaign_sends.findMany({
        where: {
          step_id: step0.id,
          status: { in: ["sent", "delivered"] },
          unsubscribed_at: null,
          ...(followUpStep.send_to === "non_openers" ? { opened_at: null } : {}),
        },
        select: { target_id: true, email: true },
      });
    });

    if (eligibleTargets.length === 0) return { dispatched: 0, reason: "no eligible recipients" };

    // Create send records
    const sendRecords = await step.run("create-send-records", async () => {
      await prismadb.crm_campaign_sends.createMany({
        data: eligibleTargets.map((t) => ({
          campaign_id: campaignId,
          step_id: stepId,
          target_id: t.target_id,
          email: t.email,
          unsubscribe_token: randomUUID(),
        })),
        skipDuplicates: true,
      });
      return prismadb.crm_campaign_sends.findMany({
        where: { step_id: stepId },
        select: { id: true },
      });
    });

    await step.sendEvent(
      "fan-out-follow-up-sends",
      sendRecords.map((s) => ({
        name: "campaigns/send-step" as const,
        data: { sendId: s.id, campaignId },
      }))
    );

    return { dispatched: sendRecords.length };
  }
);
