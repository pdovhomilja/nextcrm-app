import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { generateCSV } from "@/actions/reports/export-csv";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import * as salesActions from "@/actions/reports/sales";
import * as leadsActions from "@/actions/reports/leads";
import * as accountsActions from "@/actions/reports/accounts";
import * as activityActions from "@/actions/reports/activity";
import * as campaignsActions from "@/actions/reports/campaigns";
import * as usersActions from "@/actions/reports/users";

const resend = new Resend(process.env.RESEND_API_KEY);

async function getReportData(category: string, filters: any) {
  switch (category) {
    case "sales": return { data: await salesActions.getOppsByMonth(filters), headers: ["Month", "Opportunities"] as [string, string] };
    case "leads": return { data: await leadsActions.getNewLeads(filters), headers: ["Month", "Leads"] as [string, string] };
    case "accounts": return { data: await accountsActions.getNewAccounts(filters), headers: ["Month", "Accounts"] as [string, string] };
    case "activity": return { data: await activityActions.getTasksByAssignee(filters), headers: ["Assignee", "Tasks"] as [string, string] };
    case "campaigns": {
      const perf = await campaignsActions.getCampaignPerformance(filters);
      return { data: [{ name: "Sent", Number: perf.sent }, { name: "Opened", Number: perf.opened }, { name: "Clicked", Number: perf.clicked }], headers: ["Metric", "Count"] as [string, string] };
    }
    case "users": return { data: await usersActions.getUserGrowth(filters), headers: ["Month", "Users"] as [string, string] };
    default: return { data: [], headers: ["Name", "Value"] as [string, string] };
  }
}

function isScheduleDue(cron: string, lastSentAt: Date | null): boolean {
  if (!lastSentAt) return true;
  const elapsed = Date.now() - lastSentAt.getTime();
  if (cron.startsWith("0 9 * * *")) return elapsed >= 24 * 60 * 60 * 1000;
  if (cron.match(/^0 9 \* \* [0-6]$/)) return elapsed >= 7 * 24 * 60 * 60 * 1000;
  if (cron.match(/^0 9 [0-9]+ \* \*$/)) return elapsed >= 28 * 24 * 60 * 60 * 1000;
  return elapsed >= 15 * 60 * 1000;
}

export const reportSendScheduled = inngest.createFunction(
  {
    id: "report-send-scheduled",
    name: "Reports: Send Scheduled",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }: { step: any }) => {
    const schedules = await step.run("find-due-schedules", async () => {
      return prismadb.crm_Report_Schedule.findMany({
        where: { isActive: true },
        include: { reportConfig: true },
      });
    });

    const dueSchedules = schedules.filter((s: any) => isScheduleDue(s.cronExpression, s.lastSentAt));
    if (dueSchedules.length === 0) return { processed: 0 };

    for (const schedule of dueSchedules) {
      await step.run(`send-report-${schedule.id}`, async () => {
        const filtersRaw = schedule.reportConfig.filters as Record<string, string>;
        const params = new URLSearchParams(filtersRaw);
        const filters = parseSearchParamsToFilters(params);
        const { data, headers } = await getReportData(schedule.reportConfig.category, filters);

        const attachments: { filename: string; content: string | Buffer }[] = [];

        if (schedule.format === "csv" || schedule.format === "both") {
          const csv = generateCSV(data, headers);
          attachments.push({ filename: `${schedule.reportConfig.category}-report.csv`, content: csv });
        }

        if (schedule.format === "pdf" || schedule.format === "both") {
          const { generatePDF } = await import("@/actions/reports/export-pdf");
          const dateRange = `${filtersRaw.from ?? "all"} to ${filtersRaw.to ?? "now"}`;
          const pdfBuffer = await generatePDF(schedule.reportConfig.name, dateRange, data, headers as [string, string]);
          attachments.push({ filename: `${schedule.reportConfig.category}-report.pdf`, content: pdfBuffer });
        }

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: schedule.recipients as string[],
          subject: `Report: ${schedule.reportConfig.name}`,
          text: `Your scheduled report "${schedule.reportConfig.name}" is attached.`,
          attachments,
        });

        await prismadb.crm_Report_Schedule.update({
          where: { id: schedule.id },
          data: { lastSentAt: new Date() },
        });
      });
    }

    return { processed: dueSchedules.length };
  }
);
