import { prismadb } from "@/lib/prisma";
import type { ReportFilters, KPIData } from "./types";

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function prevPeriod(filters: ReportFilters): { dateFrom: Date; dateTo: Date } {
  const duration = filters.dateTo.getTime() - filters.dateFrom.getTime();
  return {
    dateFrom: new Date(filters.dateFrom.getTime() - duration),
    dateTo: new Date(filters.dateFrom.getTime()),
  };
}

function oppWhere(dateFrom: Date, dateTo: Date, status?: string) {
  return {
    created_on: { gte: dateFrom, lte: dateTo },
    deletedAt: null,
    ...(status ? { status } : {}),
  };
}

export async function getDashboardKPIs(filters: ReportFilters): Promise<KPIData[]> {
  const prev = prevPeriod(filters);

  const [
    revCurr,
    revPrev,
    pipeCurr,
    pipePrev,
    leadsCurr,
    leadsPrev,
    convCurr,
    convPrev,
    contactsCurr,
    contactsPrev,
    usersCurr,
    usersPrev,
    tasksCurr,
    tasksPrev,
    tasksOpenCurr,
    tasksOpenPrev,
    campaignsCurr,
    campaignsPrev,
    campaignsOpenCurr,
    campaignsOpenPrev,
    accountsCurr,
    accountsPrev,
    contractsCurr,
    contractsPrev,
  ] = await Promise.all([
    // totalRevenue: closed opportunities budget
    prismadb.crm_Opportunities.aggregate({
      where: oppWhere(filters.dateFrom, filters.dateTo, "CLOSED"),
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: oppWhere(prev.dateFrom, prev.dateTo, "CLOSED"),
      _sum: { budget: true },
    }),
    // pipelineValue: active opportunities budget
    prismadb.crm_Opportunities.aggregate({
      where: oppWhere(filters.dateFrom, filters.dateTo, "ACTIVE"),
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: oppWhere(prev.dateFrom, prev.dateTo, "ACTIVE"),
      _sum: { budget: true },
    }),
    // newLeads
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // conversionRate: closed opps count
    prismadb.crm_Opportunities.count({
      where: oppWhere(filters.dateFrom, filters.dateTo, "CLOSED"),
    }),
    prismadb.crm_Opportunities.count({
      where: oppWhere(prev.dateFrom, prev.dateTo, "CLOSED"),
    }),
    // newContacts
    prismadb.crm_Contacts.count({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Contacts.count({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
    // activeUsers
    prismadb.users.count({
      where: { updatedAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.users.count({
      where: { updatedAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // openTasks (all tasks current/prev)
    prismadb.Tasks.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.Tasks.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // open tasks specifically
    prismadb.Tasks.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, taskStatus: "OPEN" },
    }),
    prismadb.Tasks.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, taskStatus: "OPEN" },
    }),
    // campaignsSent (total sends)
    prismadb.crm_campaign_sends.count({
      where: { sentAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_campaign_sends.count({
      where: { sentAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // opened campaigns
    prismadb.crm_campaign_sends.count({
      where: { sentAt: { gte: filters.dateFrom, lte: filters.dateTo }, openedAt: { not: null } },
    }),
    prismadb.crm_campaign_sends.count({
      where: { sentAt: { gte: prev.dateFrom, lte: prev.dateTo }, openedAt: { not: null } },
    }),
    // newAccounts
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // contractsExpiring
    prismadb.crm_Contracts.count({
      where: { endDate: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_Contracts.count({
      where: { endDate: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
  ]);

  const totalRevenueCurr = Number(revCurr._sum.budget ?? 0);
  const totalRevenuePrev = Number(revPrev._sum.budget ?? 0);

  const pipelineCurr = Number(pipeCurr._sum.budget ?? 0);
  const pipelinePrev = Number(pipePrev._sum.budget ?? 0);

  const kpis: KPIData[] = [
    {
      label: "totalRevenue",
      value: totalRevenueCurr,
      previousValue: totalRevenuePrev,
      changePercent: calcChange(totalRevenueCurr, totalRevenuePrev),
      sparkline: [],
      href: "/reports/sales",
    },
    {
      label: "pipelineValue",
      value: pipelineCurr,
      previousValue: pipelinePrev,
      changePercent: calcChange(pipelineCurr, pipelinePrev),
      sparkline: [],
      href: "/reports/sales",
    },
    {
      label: "newLeads",
      value: leadsCurr,
      previousValue: leadsPrev,
      changePercent: calcChange(leadsCurr, leadsPrev),
      sparkline: [],
      href: "/reports/leads",
    },
    {
      label: "conversionRate",
      value: convCurr,
      previousValue: convPrev,
      changePercent: calcChange(convCurr, convPrev),
      sparkline: [],
      href: "/reports/sales",
    },
    {
      label: "newContacts",
      value: contactsCurr,
      previousValue: contactsPrev,
      changePercent: calcChange(contactsCurr, contactsPrev),
      sparkline: [],
      href: "/reports/leads",
    },
    {
      label: "activeUsers",
      value: usersCurr,
      previousValue: usersPrev,
      changePercent: calcChange(usersCurr, usersPrev),
      sparkline: [],
      href: "/reports/users",
    },
    {
      label: "openTasks",
      value: tasksOpenCurr,
      previousValue: tasksOpenPrev,
      changePercent: calcChange(tasksOpenCurr, tasksOpenPrev),
      sparkline: [],
      href: "/reports/activity",
    },
    {
      label: "campaignsSent",
      value: campaignsCurr,
      previousValue: campaignsPrev,
      changePercent: calcChange(campaignsCurr, campaignsPrev),
      sparkline: [],
      href: "/reports/campaigns",
    },
    {
      label: "newAccounts",
      value: accountsCurr,
      previousValue: accountsPrev,
      changePercent: calcChange(accountsCurr, accountsPrev),
      sparkline: [],
      href: "/reports/accounts",
    },
    {
      label: "contractsExpiring",
      value: contractsCurr,
      previousValue: contractsPrev,
      changePercent: calcChange(contractsCurr, contractsPrev),
      sparkline: [],
      href: "/reports/accounts",
    },
  ];

  // suppress unused vars for opened campaign metrics (available for future use)
  void campaignsOpenCurr;
  void campaignsOpenPrev;
  void tasksCurr;
  void tasksPrev;

  return kpis;
}
