import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Same logic as schedule-send but without sleepUntil
export const campaignSendNow = inngest.createFunction(
  {
    id: "campaign-send-now",
    name: "Campaign: Send Now",
    triggers: [{ event: "campaigns/send-now" }],
  },
  async ({ event, step }) => {
    const { campaignId } = event.data as { campaignId: string };

    const step0 = await step.run("get-step-0", async () => {
      return prismadb.crm_campaign_steps.findFirst({ where: { campaign_id: campaignId, order: 0 } });
    });
    if (!step0) return { skipped: true, reason: "no step 0" };

    const targets = await step.run("resolve-recipients", async () => {
      const lists = await prismadb.crm_TargetLists.findMany({
        where: { campaign_lists: { some: { campaign_id: campaignId } } },
        include: { targets: { include: { target: { select: { id: true, email: true } } } } },
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

    const sendRecords = await step.run("create-and-fan-out", async () => {
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
        select: { id: true },
      });
    });

    await step.sendEvent(
      "fan-out-sends-now",
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
      const now = new Date();
      await step.sendEvent(
        "schedule-follow-ups",
        followUpSteps.map((s) => ({
          name: "campaigns/follow-up" as const,
          data: {
            campaignId,
            stepId: s.id,
            scheduledAt: new Date(now.getTime() + s.delay_days * 86_400_000).toISOString(),
          },
        }))
      );
    }

    return { dispatched: sendRecords.length, followUps: followUpSteps.length };
  }
);
