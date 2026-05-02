import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";
import type { ReportScope } from "@/lib/authz/scopes/report-scope";
import { getReportScope } from "@/lib/authz/scopes/report-scope";

const DEFAULT_SCOPE: ReportScope = getReportScope({ id: "", role: "manager" });

export async function getCampaignPerformance(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<{
  sent: number; opened: number; clicked: number; openRate: number; clickRate: number;
}> {
  // crm_campaign_sends has no direct scope mapping; sends are scoped indirectly
  // via the parent campaign. Manager/admin: no filter. User: rely on owning
  // campaign via crm_campaigns relation in other queries.
  void scope;
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

export async function getCampaignROI(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, status: { in: ["sent", "sending"] }, ...scope.campaign },
    select: { name: true, _count: { select: { sends: true } } },
  });
  return campaigns.map((c: { name: string; _count: { sends: number } }) => ({ name: c.name, Number: c._count.sends }));
}

export async function getTopTemplates(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, ...scope.campaign },
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

export async function getTargetListGrowth(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  // crm_TargetLists has no direct ReportScope mapping; treat as campaign-adjacent.
  // Manager/admin: no filter. Future: add target-list scope key if user-scoping needed.
  void scope;
  const lists = await prismadb.crm_TargetLists.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { created_on: true, _count: { select: { targets: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const l of lists) {
    if (!l.created_on) continue;
    const d = new Date(l.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + l._count.targets;
  }
  return groupedToChartData(grouped, true);
}
