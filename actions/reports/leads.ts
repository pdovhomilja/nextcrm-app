import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";

function groupByMonth(items: { createdAt?: Date | null }[]): ChartDataPoint[] {
  const grouped: Record<string, number> = {};
  for (const item of items) {
    if (!item.createdAt) continue;
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  return groupedToChartData(grouped, true);
}

export async function getNewLeads(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { createdAt: true },
  });
  return groupByMonth(leads);
}

export async function getLeadSources(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { lead_source: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const lead of leads) {
    const source = lead.lead_source?.name ?? "Unknown";
    grouped[source] = (grouped[source] || 0) + 1;
  }
  return groupedToChartData(grouped);
}

export async function getConversionRate(filters: ReportFilters): Promise<{ leads: number; converted: number; rate: number }> {
  const leads = await prismadb.crm_Leads.count({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
  });
  const converted = await prismadb.crm_Opportunities.count({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
  });
  return { leads, converted, rate: leads > 0 ? Math.round((converted / leads) * 100) : 0 };
}

export async function getNewContacts(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { createdAt: true },
  });
  return groupByMonth(contacts);
}

export async function getContactsByAccount(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    select: { assigned_accounts: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const c of contacts) {
    const name = c.assigned_accounts?.name ?? "Unassigned";
    grouped[name] = (grouped[name] || 0) + 1;
  }
  return groupedToChartData(grouped);
}
