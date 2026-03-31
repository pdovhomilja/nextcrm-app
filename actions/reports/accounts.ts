import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";

export async function getNewAccounts(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { createdAt: true },
  });
  const grouped: Record<string, number> = {};
  for (const a of accounts) {
    const d = new Date(a.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  return groupedToChartData(grouped, true);
}

export async function getAccountsByIndustry(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { industry_type: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const a of accounts) {
    const name = a.industry_type?.name ?? "Unknown";
    grouped[name] = (grouped[name] || 0) + 1;
  }
  return groupedToChartData(grouped);
}

export async function getTopAccountsByRevenue(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, annual_revenue: { not: null } },
    select: { name: true, annual_revenue: true },
    orderBy: { annual_revenue: "desc" },
    take: 10,
  });
  return accounts.map((a: { name: string; annual_revenue: string | null }) => ({ name: a.name, Number: parseInt(a.annual_revenue ?? "0", 10) }));
}

export async function getAccountsBySize(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const accounts = await prismadb.crm_Accounts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { employees: true },
  });
  const ranges = [
    { label: "1-10", min: 1, max: 10 },
    { label: "11-50", min: 11, max: 50 },
    { label: "51-200", min: 51, max: 200 },
    { label: "201-500", min: 201, max: 500 },
    { label: "500+", min: 501, max: Infinity },
    { label: "Unknown", min: -1, max: -1 },
  ];
  const counts: Record<string, number> = {};
  for (const r of ranges) counts[r.label] = 0;
  for (const a of accounts) {
    const emp = parseInt(a.employees ?? "", 10);
    if (isNaN(emp)) { counts["Unknown"]++; continue; }
    const range = ranges.find((r) => emp >= r.min && emp <= r.max);
    if (range) counts[range.label]++;
  }
  const result: ChartDataPoint[] = [];
  for (const key of Object.keys(counts)) {
    if (counts[key] > 0) result.push({ name: key, Number: counts[key] });
  }
  return result;
}
