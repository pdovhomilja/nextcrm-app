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
    accountsCurr,
    accountsPrev,
    contractsCurr,
    contractsPrev,
  ] = await Promise.all([
    // totalRevenue
    prismadb.crm_Opportunities.aggregate({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, status: "CLOSED" },
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null, status: "CLOSED" },
      _sum: { budget: true },
    }),
    // pipelineValue
    prismadb.crm_Opportunities.aggregate({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, status: "ACTIVE" },
      _sum: { budget: true },
    }),
    prismadb.crm_Opportunities.aggregate({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null, status: "ACTIVE" },
      _sum: { budget: true },
    }),
    // newLeads
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Leads.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
    // conversionRate: closed opps count
    prismadb.crm_Opportunities.count({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null, status: "CLOSED" },
    }),
    prismadb.crm_Opportunities.count({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null, status: "CLOSED" },
    }),
    // newContacts (crm_Contacts has created_on, no deletedAt)
    prismadb.crm_Contacts.count({
      where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_Contacts.count({
      where: { created_on: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // activeUsers (status = ACTIVE, not date-filtered)
    prismadb.users.count({
      where: { userStatus: "ACTIVE" },
    }),
    prismadb.users.count({
      where: { userStatus: "ACTIVE", created_on: { lte: prev.dateTo } },
    }),
    // tasks total
    prismadb.tasks.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.tasks.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // open tasks (ACTIVE = not completed)
    prismadb.tasks.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, taskStatus: "ACTIVE" },
    }),
    prismadb.tasks.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, taskStatus: "ACTIVE" },
    }),
    // campaignsSent
    prismadb.crm_campaign_sends.count({
      where: { sent_at: { gte: filters.dateFrom, lte: filters.dateTo } },
    }),
    prismadb.crm_campaign_sends.count({
      where: { sent_at: { gte: prev.dateFrom, lte: prev.dateTo } },
    }),
    // newAccounts
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Accounts.count({
      where: { createdAt: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
    // contractsExpiring
    prismadb.crm_Contracts.count({
      where: { endDate: { gte: filters.dateFrom, lte: filters.dateTo }, deletedAt: null },
    }),
    prismadb.crm_Contracts.count({
      where: { endDate: { gte: prev.dateFrom, lte: prev.dateTo }, deletedAt: null },
    }),
  ]);

  const totalRevenueCurr = Number(revCurr._sum.budget ?? 0);
  const totalRevenuePrev = Number(revPrev._sum.budget ?? 0);
  const pipelineCurr = Number(pipeCurr._sum.budget ?? 0);
  const pipelinePrev = Number(pipePrev._sum.budget ?? 0);

  // suppress unused vars
  void tasksCurr;
  void tasksPrev;

  return [
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
      value: leadsCurr > 0 ? Math.round((convCurr / leadsCurr) * 100) : 0,
      previousValue: leadsPrev > 0 ? Math.round((convPrev / leadsPrev) * 100) : 0,
      changePercent: calcChange(
        leadsCurr > 0 ? Math.round((convCurr / leadsCurr) * 100) : 0,
        leadsPrev > 0 ? Math.round((convPrev / leadsPrev) * 100) : 0
      ),
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
}
