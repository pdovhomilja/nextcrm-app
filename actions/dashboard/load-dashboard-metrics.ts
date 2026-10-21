"use server";

import { unstable_cache } from "next/cache";
import { getTasksCount, getUsersTasksCount } from "@/actions/dashboard/get-tasks-count";
import { getInvoicesCount } from "@/actions/dashboard/get-invoices-count";
import { getCampaignsCount } from "@/actions/dashboard/get-campaigns-count";
import { getTargetsCount } from "@/actions/dashboard/get-targets-count";
import { getLeadsCount } from "@/actions/dashboard/get-leads-count";
import { getBoardsCount } from "@/actions/dashboard/get-boards-count";
import { getStorageSize } from "@/actions/documents/get-storage-size";
import { getContactCount } from "@/actions/dashboard/get-contacts-count";
import { getAccountsCount } from "@/actions/dashboard/get-accounts-count";
import { getContractsCount } from "@/actions/dashboard/get-contracts-count";
import { getDocumentsCount } from "@/actions/dashboard/get-documents-count";
import { getActiveUsersCount } from "@/actions/dashboard/get-active-users-count";
import { getOpportunitiesCount } from "@/actions/dashboard/get-opportunities-count";
import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";

export type DashboardMetrics = {
  leads: Awaited<ReturnType<typeof getLeadsCount>>;
  tasks: Awaited<ReturnType<typeof getTasksCount>>;
  invoices: Awaited<ReturnType<typeof getInvoicesCount>>;
  campaigns: Awaited<ReturnType<typeof getCampaignsCount>>;
  targets: Awaited<ReturnType<typeof getTargetsCount>>;
  storage: Awaited<ReturnType<typeof getStorageSize>>;
  projects: Awaited<ReturnType<typeof getBoardsCount>>;
  contacts: Awaited<ReturnType<typeof getContactCount>>;
  contracts: Awaited<ReturnType<typeof getContractsCount>>;
  users: Awaited<ReturnType<typeof getActiveUsersCount>>;
  accounts: Awaited<ReturnType<typeof getAccountsCount>>;
  revenue: Awaited<ReturnType<typeof getExpectedRevenue>>;
  documents: Awaited<ReturnType<typeof getDocumentsCount>>;
  opportunities: Awaited<ReturnType<typeof getOpportunitiesCount>>;
  usersTasks: Awaited<ReturnType<typeof getUsersTasksCount>>;
};

async function fetchDashboardMetrics(
  userId: string,
  displayCurrency: string
): Promise<DashboardMetrics> {
  const [
    leads,
    tasks,
    invoices,
    campaigns,
    targets,
    storage,
    projects,
    contacts,
    contracts,
    users,
    accounts,
    revenue,
    documents,
    opportunities,
    usersTasks,
  ] = await Promise.all([
    getLeadsCount(),
    getTasksCount(),
    getInvoicesCount(),
    getCampaignsCount(),
    getTargetsCount(),
    getStorageSize(),
    getBoardsCount(),
    getContactCount(),
    getContractsCount(),
    getActiveUsersCount(),
    getAccountsCount(),
    getExpectedRevenue(displayCurrency),
    getDocumentsCount(),
    getOpportunitiesCount(),
    getUsersTasksCount(userId),
  ]);

  return {
    leads,
    tasks,
    invoices,
    campaigns,
    targets,
    storage,
    projects,
    contacts,
    contracts,
    users,
    accounts,
    revenue,
    documents,
    opportunities,
    usersTasks,
  };
}

/** Dashboard tiles — parallel queries + short cross-request cache. */
export async function loadDashboardMetrics(userId: string, displayCurrency: string) {
  return unstable_cache(
    () => fetchDashboardMetrics(userId, displayCurrency),
    ["dashboard-metrics-v1", userId, displayCurrency],
    { revalidate: 90, tags: [`dashboard-${userId}`] }
  )();
}
