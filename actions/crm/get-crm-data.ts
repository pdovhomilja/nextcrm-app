import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getAllCrmData = cache(async () => {
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
  ] = await Promise.all([
    prismadb.crm_Accounts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Opportunities.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Leads.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Contacts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Contracts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Opportunities_Type.findMany({}),
    prismadb.crm_Opportunities_Sales_Stages.findMany({}),
    prismadb.crm_campaigns.findMany({}),
    prismadb.crm_Industry_Type.findMany({}),
    prismadb.crm_Contact_Types.findMany({ orderBy: { name: "asc" } }),
    prismadb.crm_Lead_Sources.findMany({ orderBy: { name: "asc" } }),
    prismadb.crm_Lead_Statuses.findMany({ orderBy: { name: "asc" } }),
    prismadb.crm_Lead_Types.findMany({ orderBy: { name: "asc" } }),
    prismadb.currency.findMany({ where: { isEnabled: true }, orderBy: { code: "asc" } }),
    prismadb.exchangeRate.findMany(),
  ]);

  const data = {
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
    exchangeRates: exchangeRates.map((r: { fromCurrency: string; toCurrency: string; rate: unknown }) => ({
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: Number(r.rate),
    })),
  };

  return data;
});
