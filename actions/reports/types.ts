export type ReportCategory = "sales" | "leads" | "accounts" | "activity" | "campaigns" | "users";

export const REPORT_CATEGORIES: ReportCategory[] = ["sales", "leads", "accounts", "activity", "campaigns", "users"];

export type ReportFilters = {
  dateFrom: Date;
  dateTo: Date;
  assigneeId?: string;
  accountId?: string;
  salesStage?: string;
  campaignId?: string;
  industryType?: string;
  userRole?: string;
};

export type ChartDataPoint = { name: string; Number: number };

export type KPIData = {
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  sparkline: number[];
  href: string;
};

export type ExportFormat = "csv" | "pdf" | "both";
export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";

export type DatePreset = {
  key: string;
  labelKey: string;
  getRange: () => { from: Date; to: Date };
};

export const DATE_PRESETS: DatePreset[] = [
  { key: "7d", labelKey: "last7Days", getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 7); return { from, to }; } },
  { key: "30d", labelKey: "last30Days", getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 30); return { from, to }; } },
  { key: "90d", labelKey: "last90Days", getRange: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 90); return { from, to }; } },
  { key: "ytd", labelKey: "yearToDate", getRange: () => { const to = new Date(); const from = new Date(to.getFullYear(), 0, 1); return { from, to }; } },
  { key: "all", labelKey: "allTime", getRange: () => { const to = new Date(); const from = new Date(2020, 0, 1); return { from, to }; } },
];

export function parseSearchParamsToFilters(params: URLSearchParams): ReportFilters {
  const fromStr = params.get("from");
  const toStr = params.get("to");
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return {
    dateFrom: fromStr ? new Date(fromStr) : thirtyDaysAgo,
    dateTo: toStr ? new Date(toStr) : now,
    assigneeId: params.get("assigneeId") ?? undefined,
    accountId: params.get("accountId") ?? undefined,
    salesStage: params.get("salesStage") ?? undefined,
    campaignId: params.get("campaignId") ?? undefined,
    industryType: params.get("industryType") ?? undefined,
    userRole: params.get("userRole") ?? undefined,
  };
}

/** Convert a Record<string, number> to ChartDataPoint[], optionally sorted by key */
export function groupedToChartData(
  grouped: Record<string, number>,
  sort = false
): ChartDataPoint[] {
  const keys = sort ? Object.keys(grouped).sort() : Object.keys(grouped);
  return keys.map((name) => ({ name, Number: grouped[name] }));
}

export function filtersToSearchParams(filters: ReportFilters): string {
  const params = new URLSearchParams();
  params.set("from", filters.dateFrom.toISOString().split("T")[0]);
  params.set("to", filters.dateTo.toISOString().split("T")[0]);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.salesStage) params.set("salesStage", filters.salesStage);
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  if (filters.industryType) params.set("industryType", filters.industryType);
  if (filters.userRole) params.set("userRole", filters.userRole);
  return params.toString();
}
