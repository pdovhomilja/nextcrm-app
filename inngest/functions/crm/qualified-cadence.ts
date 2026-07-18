import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { cadenceSchedule } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.5: 5-touch follow-up cadence after the quote goes out (entry into
// the stage whose stage_kind is "qualified"). A later stage change on the
// same deal cancels the remaining touches via cancelOn; each touch also
// re-checks the deal before creating its task (belt and suspenders).
export const qualifiedCadence = inngest.createFunction(
  {
    id: "crm-qualified-cadence",
    name: "CRM: Qualified follow-up cadence",
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
    if (stage?.stage_kind !== "qualified") return { skipped: true, reason: "not a qualified stage" };

    // Instance settings at entry time — later changes affect future entries.
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const entry = new Date(event.ts ?? Date.now());
    const touches = cadenceSchedule(entry, settings);
    let created = 0;

    for (const touch of touches) {
      await step.sleepUntil(`wait-touch-${touch.touch}`, touch.date);
      const result = await step.run(`create-touch-${touch.touch}`, async () => {
        const opp = await prismadb.crm_Opportunities.findUnique({
          where: { id: record_id },
          select: {
            status: true, sales_stage: true, account: true, assigned_to: true, name: true,
            assigned_sales_stage: { select: { stage_kind: true } },
          },
        });
        if (!opp || opp.status !== "ACTIVE") return null;
        if (opp.assigned_sales_stage?.stage_kind !== "qualified") return null;
        return createAutoTask({
          title: touch.title,
          content: `${touch.content}\nDeal: ${opp.name ?? record_id}`,
          accountId: opp.account,
          opportunityId: record_id,
          assigneeId: opp.assigned_to,
          dueDateAt: touch.date,
        });
      });
      if (result) created += 1;
    }
    return { created };
  }
);
