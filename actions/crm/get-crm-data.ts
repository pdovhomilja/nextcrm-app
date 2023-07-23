import { prismadb } from "@/lib/prisma";

export const getAllCrmData = async () => {
  const users = await prismadb.users.findMany({});
  const accounts = await prismadb.crm_Accounts.findMany({});
  const contacts = await prismadb.crm_Contacts.findMany({});
  const saleTypes = await prismadb.crm_Opportunities_Type.findMany({});
  const saleStages = await prismadb.crm_Opportunities_Sales_Stages.findMany({});
  const campaigns = await prismadb.crm_campains.findMany({});
  const industries = await prismadb.crm_Industry_Type.findMany({});

  const data = {
    users,
    accounts,
    contacts,
    saleTypes,
    saleStages,
    campaigns,
    industries,
  };

  return data;
};
