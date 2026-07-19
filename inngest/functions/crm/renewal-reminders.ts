import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { renewalWindowEnd } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.8: "renewals surface automatically". Weekly sweep over contract
// renewal reminders and account-product renewal dates in the configured
// window; createAutoTask's title-based idempotency makes re-runs safe.
export const renewalReminders = inngest.createFunction(
  {
    id: "crm-renewal-reminders",
    name: "CRM: Renewal reminders",
    triggers: [{ cron: "0 7 * * 1" }],
  },
  async ({ step }) => {
    const now = new Date();
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const windowEnd = renewalWindowEnd(now, settings);
    let created = 0;

    const contracts = await step.run("find-contract-renewals", async () => {
      return prismadb.crm_Contracts.findMany({
        where: {
          deletedAt: null,
          renewalReminderDate: { gte: now, lte: windowEnd },
        },
        select: { id: true, title: true, account: true, assigned_to: true, renewalReminderDate: true },
      });
    });
    for (const c of contracts) {
      const result = await step.run(`contract-${c.id}`, async () => {
        const reminderDate = c.renewalReminderDate ? new Date(c.renewalReminderDate) : now;
        // Date in the title = per-cycle uniqueness; dedupAnyStatus so a
        // completed reminder is not respawned by next week's sweep.
        return createAutoTask({
          title: `Renewal ${reminderDate.toISOString().slice(0, 10)}: contract "${c.title}"`,
          content: `Contract renewal reminder date is ${reminderDate.toDateString()}. Reach out about renewal terms.\n${process.env.NEXT_PUBLIC_APP_URL}/crm/contracts/${c.id}`,
          accountId: c.account,
          assigneeId: c.assigned_to,
          dueDateAt: reminderDate,
          dedupAnyStatus: true,
        });
      });
      if (result) created += 1;
    }

    const products = await step.run("find-product-renewals", async () => {
      return prismadb.crm_AccountProducts.findMany({
        where: {
          status: "ACTIVE",
          renewal_date: { gte: now, lte: windowEnd },
        },
        select: {
          id: true, renewal_date: true, accountId: true,
          account: { select: { assigned_to: true, name: true } },
          product: { select: { name: true } },
        },
      });
    });
    for (const p of products) {
      const result = await step.run(`product-${p.id}`, async () => {
        const renewalDate = p.renewal_date ? new Date(p.renewal_date) : now;
        return createAutoTask({
          title: `Renewal ${renewalDate.toISOString().slice(0, 10)}: ${p.product?.name ?? "product"} @ ${p.account?.name ?? p.accountId}`,
          content: `Product subscription renews on ${renewalDate.toDateString()}. Confirm renewal with the client.`,
          accountId: p.accountId,
          assigneeId: p.account?.assigned_to ?? null,
          dueDateAt: renewalDate,
          dedupAnyStatus: true,
        });
      });
      if (result) created += 1;
    }

    return { created };
  }
);
