import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  contactReadScopeWhere,
  contractReadScopeWhere,
  leadReadScopeWhere,
  opportunityReadScopeWhere,
} from "@/lib/authz";

// Entity lists are scoped to the caller (GHSA-q96c-2vj9-8v7f): a `user` gets
// only records they own, created or reach via an account in their scope.
export const getAllCrmData = cache(async () => {
  const user = await requireAuthenticated({ partner: true });
  const [
    accounts,
    opportunities,
    leads,
    contacts,
    contracts,
    saleTypes,
    saleStages,
    campaigns,
    industries,
    contactTypes,
    leadSources,
    leadStatuses,
    leadTypes,
    currencies,
    exchangeRates,
    productCategories,
  ] = await Promise.all([
    prismadb.crm_Accounts.findMany({ where: accountReadScopeWhere(user) }),
    prismadb.crm_Opportunities.findMany({ where: opportunityReadScopeWhere(user) }),
    prismadb.crm_Leads.findMany({ where: leadReadScopeWhere(user) }),
    prismadb.crm_Contacts.findMany({ where: contactReadScopeWhere(user) }),
    prismadb.crm_Contracts.findMany({ where: contractReadScopeWhere(user) }),
    prismadb.crm_Opportunities_Type.findMany({}),
    prismadb.crm_Opportunities_Sales_Stages.findMany({}),
    prismadb.crm_campaigns.findMany({ where: { deletedAt: null } }),
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

  const data = {
    accounts,
    opportunities: serializeDecimalsList(opportunities),
    leads,
    contacts,
    contracts: serializeDecimalsList(contracts),
    saleTypes,
    saleStages,
    campaigns,
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

  return data;
});
