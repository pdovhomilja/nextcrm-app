"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getAllCrmData = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const users = await prismadb.users.findMany({
    where: {
      userStatus: "ACTIVE",
      organizationId: session.user.organizationId,
    },
  });
  const accounts = await prismadb.crm_Accounts.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const opportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const leads = await prismadb.crm_Leads.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const contacts = await prismadb.crm_Contacts.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const contracts = await prismadb.crm_Contracts.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  // Shared reference data - no organizationId filter
  const saleTypes = await prismadb.crm_Opportunities_Type.findMany({});
  const saleStages = await prismadb.crm_Opportunities_Sales_Stages.findMany({
    orderBy: {
      probability: "asc",
    },
  });
  const campaigns = await prismadb.crm_campaigns.findMany({});
  const industries = await prismadb.crm_Industry_Type.findMany({});

  const data = {
    users,
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
};
