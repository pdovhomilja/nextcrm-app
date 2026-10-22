import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  contactReadScopeWhere,
  contractReadScopeWhere,
  leadReadScopeWhere,
  opportunityReadScopeWhere,
  type AuthzUser,
} from "@/lib/authz";

/** Shared CRM dropdowns / lookups (admin CRM settings, currencies in forms). */
export const getCachedCrmConfigLookups = unstable_cache(
  async () => {
    const [
      saleTypes,
      saleStages,
      industries,
      contactTypes,
      leadSources,
      leadStatuses,
      leadTypes,
      currencies,
      exchangeRates,
      productCategories,
    ] = await Promise.all([
      prismadb.crm_Opportunities_Type.findMany({}),
      prismadb.crm_Opportunities_Sales_Stages.findMany({}),
      prismadb.crm_Industry_Type.findMany({}),
      prismadb.crm_Contact_Types.findMany({ orderBy: { name: "asc" } }),
      prismadb.crm_Lead_Sources.findMany({ orderBy: { name: "asc" } }),
      prismadb.crm_Lead_Statuses.findMany({ orderBy: { name: "asc" } }),
      prismadb.crm_Lead_Types.findMany({ orderBy: { name: "asc" } }),
      prismadb.currency.findMany({ where: { isEnabled: true }, orderBy: { code: "asc" } }),
      prismadb.exchangeRate.findMany(),
      prismadb.crm_ProductCategories.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
    ]);

    return {
      saleTypes,
      saleStages,
      industries,
      contactTypes,
      leadSources,
      leadStatuses,
      leadTypes,
      currencies,
      productCategories,
      exchangeRates: exchangeRates.map((r: { fromCurrency: string; toCurrency: string; rate: unknown }) => ({
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: Number(r.rate),
      })),
    };
  },
  ["crm-config-lookups"],
  { revalidate: 300, tags: ["crm-config"] }
);

const accountPickerSelect = { id: true, name: true } as const;
const contactPickerSelect = { id: true, first_name: true, last_name: true } as const;
const campaignPickerSelect = { id: true, name: true } as const;

async function loadCrmPickers(user: { id: string; role: AuthzUser["role"] }) {
  const [configData, accounts, contacts, campaigns] = await Promise.all([
    getCachedCrmConfigLookups(),
    prismadb.crm_Accounts.findMany({
      where: accountReadScopeWhere(user),
      select: accountPickerSelect,
      orderBy: { name: "asc" },
    }),
    prismadb.crm_Contacts.findMany({
      where: contactReadScopeWhere(user),
      select: contactPickerSelect,
      orderBy: { last_name: "asc" },
    }),
    prismadb.crm_campaigns.findMany({
      where: { deletedAt: null },
      select: campaignPickerSelect,
      orderBy: { name: "asc" },
    }),
  ]);

  return { ...configData, accounts, contacts, campaigns };
}

/** Dropdown data for CRM forms. Id and name only — not full entity rows. */
export const getCrmPickerData = cache(async () => {
  const user = await requireAuthenticated();
  return unstable_cache(
    () => loadCrmPickers(user),
    ["crm-pickers-v1", user.id, user.role],
    { revalidate: 120, tags: ["crm-config", `crm-pickers-${user.id}`] }
  )();
});

// Entity lists are scoped to the caller (GHSA-q96c-2vj9-8v7f): a `user` gets
// only records they own, created or reach via an account in their scope.
// Rows are id/name pickers. List pages that need full records load those separately.
export const getAllCrmData = cache(async () => {
  const user = await requireAuthenticated();
  const [pickers, opportunities, leads, contracts] = await Promise.all([
    loadCrmPickers(user),
    prismadb.crm_Opportunities.findMany({
      where: opportunityReadScopeWhere(user),
      select: { id: true, name: true, account: true },
    }),
    prismadb.crm_Leads.findMany({
      where: leadReadScopeWhere(user),
      select: { id: true },
    }),
    prismadb.crm_Contracts.findMany({
      where: contractReadScopeWhere(user),
      select: { id: true, title: true },
    }),
  ]);

  return {
    ...pickers,
    opportunities: opportunities.map((row) => ({
      id: row.id,
      name: row.name,
      account: row.account,
      accountId: row.account,
    })),
    leads,
    contracts,
  };
});

