import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";

function dateRangeWhere(filters: ReportFilters) {
  return {
    created_on: { gte: filters.dateFrom, lte: filters.dateTo },
    deletedAt: null,
  };
}

export async function getRevenue(filters: ReportFilters): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    _sum: { budget: true },
  });
  return Number(result._sum.budget ?? 0);
}

export async function getPipelineValue(filters: ReportFilters): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: { ...dateRangeWhere(filters), status: "ACTIVE" },
    _sum: { budget: true },
  });
  return Number(result._sum.budget ?? 0);
}

export async function getOppsByStage(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { assigned_sales_stage: { select: { name: true } } },
  });
  const grouped = opps.reduce<Record<string, number>>((acc, opp) => {
    const stage = opp.assigned_sales_stage?.name ?? "Unassigned";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, count]: [string, number]) => ({ name, Number: count }));
}

export async function getOppsByMonth(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { created_on: true },
  });
  const grouped = opps.reduce<Record<string, number>>((acc, opp) => {
    if (!opp.created_on) return acc;
    const d = new Date(opp.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]: [string, number]) => ({ name, Number: count }));
}

export async function getWinLossRate(
  filters: ReportFilters
): Promise<{ won: number; total: number; rate: number }> {
  const won = await prismadb.crm_Opportunities.count({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
  });
  const total = await prismadb.crm_Opportunities.count({
    where: { ...dateRangeWhere(filters), status: { in: ["CLOSED", "INACTIVE"] } },
  });
  return { won, total, rate: total > 0 ? Math.round((won / total) * 100) : 0 };
}

export async function getAvgDealSize(filters: ReportFilters): Promise<number> {
  const result = await prismadb.crm_Opportunities.aggregate({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    _avg: { budget: true },
  });
  return Number(result._avg.budget ?? 0);
}

export async function getSalesCycleLength(filters: ReportFilters): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED", close_date: { not: null } },
    select: { created_on: true, close_date: true },
  });
  if (opps.length === 0) return 0;
  const totalDays = opps.reduce((sum: number, opp) => {
    if (!opp.created_on || !opp.close_date) return sum;
    const diff = opp.close_date.getTime() - opp.created_on.getTime();
    return sum + diff / (1000 * 60 * 60 * 24);
  }, 0);
  return Math.round(totalDays / opps.length);
}
