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
  const saleTypes = await prismadb.crm_Opportunities_Type.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const saleStages = await prismadb.crm_Opportunities_Sales_Stages.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const campaigns = await prismadb.crm_campaigns.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  const industries = await prismadb.crm_Industry_Type.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });

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
