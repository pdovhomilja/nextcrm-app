import { prismadb } from "@/lib/prisma";

export const getOpportunities = async () => {
  const data = await prismadb.crm_Opportunities.findMany({});
  return data;
};
