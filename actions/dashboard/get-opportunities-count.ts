import { prismadb } from "@/lib/prisma";

export const getOpportunitiesCount = async () => {
  const data = await prismadb.crm_Opportunities.count({ where: { deletedAt: null } });
  return data;
};
