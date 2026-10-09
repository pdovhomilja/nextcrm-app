import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const getCrmConfigData = unstable_cache(
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

export const getAllCrmData = cache(async () => {
  const [
    configData,
    accounts,
    opportunities,
    leads,
    contacts,
    contracts,
    campaigns,
  ] = await Promise.all([
    getCrmConfigData(),
    prismadb.crm_Accounts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Opportunities.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Leads.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Contacts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_Contracts.findMany({ where: { deletedAt: null } }),
    prismadb.crm_campaigns.findMany({ where: { deletedAt: null } }),
  ]);

  return {
    ...configData,
    accounts,
    opportunities: serializeDecimalsList(opportunities),
    leads,
    contacts,
    contracts: serializeDecimalsList(contracts),
    campaigns,
  };
});

