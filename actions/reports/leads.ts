import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";
import type { ReportScope } from "@/lib/authz/scopes/report-scope";
import { getReportScope } from "@/lib/authz/scopes/report-scope";

const DEFAULT_SCOPE: ReportScope = getReportScope({ id: "", role: "manager" });

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

export async function getNewLeads(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, ...scope.lead },
    select: { createdAt: true },
  });
  return groupByMonth(leads);
}

export async function getLeadSources(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const leads = await prismadb.crm_Leads.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, ...scope.lead },
    select: { lead_source: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const lead of leads) {
    const source = lead.lead_source?.name ?? "Unknown";
    grouped[source] = (grouped[source] || 0) + 1;
  }
  return groupedToChartData(grouped);
}

export async function getConversionRate(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<{ leads: number; converted: number; rate: number }> {
  const leads = await prismadb.crm_Leads.count({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, ...scope.lead },
  });
  const converted = await prismadb.crm_Opportunities.count({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, ...scope.opportunity },
  });
  return { leads, converted, rate: leads > 0 ? Math.round((converted / leads) * 100) : 0 };
}

export async function getNewContacts(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, ...scope.contact },
    select: { created_on: true },
  });
  return groupByMonth(contacts.map((c: { created_on: Date | null }) => ({ createdAt: c.created_on })));
}

export async function getContactsByAccount(
  filters: ReportFilters,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<ChartDataPoint[]> {
  const contacts = await prismadb.crm_Contacts.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, ...scope.contact },
    select: { assigned_accounts: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const c of contacts) {
    const name = c.assigned_accounts?.name ?? "Unassigned";
    grouped[name] = (grouped[name] || 0) + 1;
  }
  return groupedToChartData(grouped);
}
