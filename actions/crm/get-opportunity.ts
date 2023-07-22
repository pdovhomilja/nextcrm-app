import { prismadb } from "@/lib/prisma";

export const getOpportunity = async (opportunityId: string) => {
  const data = await prismadb.crm_Opportunities.findFirst({
    where: {
      id: opportunityId,
    },
  });
  return data;
};
