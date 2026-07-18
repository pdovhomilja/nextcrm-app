import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { careSchedule } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.8: post-delivery Care touchpoints — check-in, referral ask, then
// bounded quarterly entries (intervals instance-configurable). Cancelled
// automatically if the deal changes stage again; each entry re-checks the
// deal first.
export const careTasks = inngest.createFunction(
  {
    id: "crm-care-tasks",
    name: "CRM: Care touchpoints",
    triggers: [{ event: "crm/opportunity.stage-changed" }],
    cancelOn: [{ event: "crm/opportunity.stage-changed", match: "data.record_id" }],
  },
  async ({ event, step }) => {
    const { record_id, to_stage } = event.data as { record_id: string; to_stage: string };

    const stage = await step.run("load-stage", async () => {
      return prismadb.crm_Opportunities_Sales_Stages.findUnique({
        where: { id: to_stage },
        select: { stage_kind: true },
      });
    });
    if (stage?.stage_kind !== "care") return { skipped: true, reason: "not a care stage" };

    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const entries = careSchedule(new Date(event.ts ?? Date.now()), settings);
    let created = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      await step.sleepUntil(`wait-care-${i}`, entry.date);
      const result = await step.run(`create-care-${i}`, async () => {
        const opp = await prismadb.crm_Opportunities.findUnique({
          where: { id: record_id },
          select: {
            status: true, account: true, assigned_to: true, name: true,
            assigned_sales_stage: { select: { stage_kind: true } },
          },
        });
        if (!opp || opp.status !== "ACTIVE") return null;
        if (opp.assigned_sales_stage?.stage_kind !== "care") return null;
        return createAutoTask({
          title: entry.title,
          content: `${entry.content}\nClient: ${opp.name ?? record_id}`,
          accountId: opp.account,
          opportunityId: record_id,
          assigneeId: opp.assigned_to,
          dueDateAt: entry.date,
        });
      });
      if (result) created += 1;
    }
    return { created };
  }
);
