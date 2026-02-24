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
  ] = await Promise.all([
    prismadb.crm_Accounts.findMany({}),
    prismadb.crm_Opportunities.findMany({}),
    prismadb.crm_Leads.findMany({}),
    prismadb.crm_Contacts.findMany({}),
    prismadb.crm_Contracts.findMany({}),
    prismadb.crm_Opportunities_Type.findMany({}),
    prismadb.crm_Opportunities_Sales_Stages.findMany({}),
    prismadb.crm_campaigns.findMany({}),
    prismadb.crm_Industry_Type.findMany({}),
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
  };

  return data;
});
