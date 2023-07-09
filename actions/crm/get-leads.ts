import { prismadb } from "@/lib/prisma";

export const getLeads = async () => {
  const data = await prismadb.crm_Leads.findMany({});
  return data;
};
