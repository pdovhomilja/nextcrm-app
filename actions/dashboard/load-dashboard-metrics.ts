"use server";

import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { getStorageSize } from "@/actions/documents/get-storage-size";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";

export type DashboardMetrics = {
  leads: number;
  tasks: number;
  invoices: number;
  campaigns: number;
  targets: number;
  storage: number;
  projects: number;
  contacts: number;
  contracts: number;
  users: number;
  accounts: number;
  revenue: number;
  documents: number;
  opportunities: number;
  usersTasks: number;
};

type CountRow = {
  leads: number;
  tasks: number;
  invoices: number;
  campaigns: number;
  targets: number;
  documents: number;
  projects: number;
  contacts: number;
  contracts: number;
  users: number;
  accounts: number;
  opportunities: number;
  users_tasks: number;
};

function asCount(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/** One round trip. Vercel keeps only two DB connections, so 15 separate counts queue. */
async function fetchDashboardCounts(userId: string, allTasks: boolean): Promise<CountRow> {
  const rows = await prismadb.$queryRaw<CountRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "crm_Leads" WHERE "deletedAt" IS NULL) AS leads,
      (SELECT COUNT(*)::int FROM "Tasks" WHERE ${allTasks} OR "user" = CAST(${userId} AS uuid)) AS tasks,
      (SELECT COUNT(*)::int FROM "Invoices") AS invoices,
      (SELECT COUNT(*)::int FROM "crm_campaigns") AS campaigns,
      (SELECT COUNT(*)::int FROM "crm_Targets") AS targets,
      (SELECT COUNT(*)::int FROM "Documents") AS documents,
      (SELECT COUNT(*)::int FROM "Boards") AS projects,
      (SELECT COUNT(*)::int FROM "crm_Contacts" WHERE "deletedAt" IS NULL) AS contacts,
      (SELECT COUNT(*)::int FROM "crm_Contracts" WHERE "deletedAt" IS NULL) AS contracts,
      (SELECT COUNT(*)::int FROM "Users" WHERE "userStatus"::text = 'ACTIVE') AS users,
      (SELECT COUNT(*)::int FROM "crm_Accounts" WHERE "deletedAt" IS NULL) AS accounts,
      (SELECT COUNT(*)::int FROM "crm_Opportunities" WHERE "deletedAt" IS NULL) AS opportunities,
      (SELECT COUNT(*)::int FROM "Tasks" WHERE "user" = CAST(${userId} AS uuid)) AS users_tasks
  `;
  return rows[0];
}

async function fetchDashboardMetrics(
  userId: string,
  displayCurrency: string,
  allTasks: boolean
): Promise<DashboardMetrics> {
  const [counts, storage, revenue] = await Promise.all([
    fetchDashboardCounts(userId, allTasks),
    getStorageSize(),
    getExpectedRevenue(displayCurrency),
  ]);

  return {
    leads: asCount(counts.leads),
    tasks: asCount(counts.tasks),
    invoices: asCount(counts.invoices),
    campaigns: asCount(counts.campaigns),
    targets: asCount(counts.targets),
    storage,
    projects: asCount(counts.projects),
    contacts: asCount(counts.contacts),
    contracts: asCount(counts.contracts),
    users: asCount(counts.users),
    accounts: asCount(counts.accounts),
    revenue,
    documents: asCount(counts.documents),
    opportunities: asCount(counts.opportunities),
    usersTasks: asCount(counts.users_tasks),
  };
}

/** Dashboard tiles — parallel queries + short cross-request cache. */
export async function loadDashboardMetrics(
  userId: string,
  displayCurrency: string,
  allTasks: boolean
) {
  return unstable_cache(
    () => fetchDashboardMetrics(userId, displayCurrency, allTasks),
    ["dashboard-metrics-v2", userId, displayCurrency, allTasks ? "all" : "own"],
    { revalidate: 90, tags: [`dashboard-${userId}`] }
  )();
}
