import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

function dateRangeWhere(filters: ReportFilters) {
  return {
    created_on: { gte: filters.dateFrom, lte: filters.dateTo },
    deletedAt: null,
  };
}

export async function getRevenue(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    select: { budget: true, currency: true },
  });
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.toNumber();
}

export async function getPipelineValue(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "ACTIVE" },
    select: { budget: true, currency: true },
  });
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.toNumber();
}

export async function getOppsByStage(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { assigned_sales_stage: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const opp of opps) {
    const stage = opp.assigned_sales_stage?.name ?? "Unassigned";
    grouped[stage] = (grouped[stage] || 0) + 1;
  }
  return groupedToChartData(grouped);
}

export async function getOppsByMonth(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: dateRangeWhere(filters),
    select: { created_on: true },
  });
  const grouped: Record<string, number> = {};
  for (const opp of opps) {
    if (!opp.created_on) continue;
    const d = new Date(opp.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  return groupedToChartData(grouped, true);
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

export async function getAvgDealSize(filters: ReportFilters, displayCurrency: string): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED" },
    select: { budget: true, currency: true },
  });
  if (opps.length === 0) return 0;
  const rates = await getExchangeRates();
  let total = new Decimal(0);
  for (const opp of opps) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }
  return total.div(opps.length).toDecimalPlaces(2).toNumber();
}

export async function getSalesCycleLength(filters: ReportFilters): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: { ...dateRangeWhere(filters), status: "CLOSED", close_date: { not: null } },
    select: { created_on: true, close_date: true },
  });
  if (opps.length === 0) return 0;
  let totalDays = 0;
  for (const opp of opps) {
    if (!opp.created_on || !opp.close_date) continue;
    const diff = opp.close_date.getTime() - opp.created_on.getTime();
    totalDays += diff / (1000 * 60 * 60 * 24);
  }
  return Math.round(totalDays / opps.length);
}
