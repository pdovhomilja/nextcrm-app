import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const campaignScheduleSend = inngest.createFunction(
  {
    id: "campaign-schedule-send",
    name: "Campaign: Schedule Send",
    triggers: [{ event: "campaigns/schedule" }],
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
        select: { status: true, target_lists: true },
      });
    });

    if (!campaign || campaign.status === "paused" || campaign.status === "deleted") {
      return { skipped: true, reason: campaign?.status };
    }

    // Get step 0
    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({
        where: { campaign_id: campaignId, order: 0 },
      });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    // Resolve recipients (deduplicated by email)
    const targets = await step.run("resolve-recipients", async () => {
      const lists = await prismadb.crm_TargetLists.findMany({
        where: {
          campaign_lists: { some: { campaign_id: campaignId } },
        },
        include: {
          targets: { include: { target: { select: { id: true, email: true } } } },
        },
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

    await prismadb.crm_campaigns.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    return { dispatched: sendRecords.length };
  }
);
