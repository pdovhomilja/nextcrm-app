import { prismadb } from "@/lib/prisma";

export const getOpportunitiesCount = async () => {
  const data = await prismadb.crm_Opportunities.count();
  return data;
};
