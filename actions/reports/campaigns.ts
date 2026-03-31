import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";

export async function getCampaignPerformance(filters: ReportFilters): Promise<{
  sent: number; opened: number; clicked: number; openRate: number; clickRate: number;
}> {
  const dateFilter = { sent_at: { gte: filters.dateFrom, lte: filters.dateTo }, status: "sent" };
  const sent = await prismadb.crm_campaign_sends.count({ where: dateFilter });
  const opened = await prismadb.crm_campaign_sends.count({ where: { ...dateFilter, opened_at: { not: null } } });
  const clicked = await prismadb.crm_campaign_sends.count({ where: { ...dateFilter, clicked_at: { not: null } } });
  return {
    sent, opened, clicked,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
  };
}

export async function getCampaignROI(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, status: { in: ["sent", "sending"] } },
    select: { name: true, _count: { select: { sends: true } } },
  });
  return campaigns.map((c: { name: string; _count: { sends: number } }) => ({ name: c.name, Number: c._count.sends }));
}

export async function getTopTemplates(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { template: { select: { name: true } }, _count: { select: { sends: true } } },
    orderBy: { sends: { _count: "desc" } },
    take: 10,
  });
  const result: ChartDataPoint[] = [];
  for (const c of campaigns) {
    if (c.template) result.push({ name: c.template.name, Number: c._count.sends });
  }
  return result;
}

export async function getTargetListGrowth(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const lists = await prismadb.crm_TargetLists.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { createdAt: true, _count: { select: { targets: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const l of lists) {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + l._count.targets;
  }
  return groupedToChartData(grouped, true);
}
