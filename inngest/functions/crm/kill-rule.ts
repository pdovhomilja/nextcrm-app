import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { isKillDue } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { getLastClientActivity } from "@/lib/crm/client-activity";
import { writeAuditLog } from "@/lib/audit-log";

// Spec §3.5 kill rule: killAfterDays (default 45) of client silence on a
// Qualified deal -> Lost (status CLOSED per the 2026-07-18 decision) + rep
// notification. Daily sweep; the clock derives from getLastClientActivity,
// so any inbound email or logged activity restarts it automatically.
export const killRule = inngest.createFunction(
  {
    id: "crm-kill-rule",
    name: "CRM: 45-day kill rule",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const candidates = await step.run("find-qualified-deals", async () => {
      return prismadb.crm_Opportunities.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          assigned_sales_stage: { stage_kind: "qualified" },
        },
        select: {
          id: true, name: true, contact: true, account: true,
          stage_entered_at: true, assigned_to: true,
        },
        take: 500,
      });
    });

    let closed = 0;
    for (const opp of candidates) {
      const didClose = await step.run(`check-${opp.id}`, async () => {
        // step.run JSON-serializes returns — revive the date field.
        const last = await getLastClientActivity({
          ...opp,
          stage_entered_at: opp.stage_entered_at ? new Date(opp.stage_entered_at) : null,
        });
        if (!isKillDue(last, new Date(), settings)) return false;

        await prismadb.crm_Opportunities.update({
          where: { id: opp.id },
          data: { status: "CLOSED", updatedBy: opp.assigned_to ?? undefined },
        });
        await writeAuditLog({
          entityType: "opportunity",
          entityId: opp.id,
          action: "updated",
          changes: [
            { field: "status", old: "ACTIVE", new: "CLOSED" },
            { field: "close_reason", old: null, new: `${settings.killAfterDays}-day kill rule` },
          ],
          userId: opp.assigned_to ?? null,
        });
        if (opp.assigned_to) {
          const rep = await prismadb.users.findUnique({ where: { id: opp.assigned_to } });
          if (rep?.email) {
            try {
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL!,
                to: rep.email,
                subject: `Deal closed by ${settings.killAfterDays}-day rule: ${opp.name ?? opp.id}`,
                text: `The deal "${opp.name ?? opp.id}" had no client activity for ${settings.killAfterDays} days and was closed as Lost.\nReopen it if this is wrong: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${opp.id}`,
              });
            } catch (error) {
              console.error("[killRule] notification failed:", error);
            }
          }
        }
        return true;
      });
      if (didClose) closed += 1;
    }
    return { checked: candidates.length, closed };
  }
);
