import { prismadb } from "@/lib/prisma";
import { crm_Opportunities } from "@prisma/client";

export const getExpectedRevenue = async () => {
  const activeOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      status: "ACTIVE",
    },
  });

  const totalAmount = activeOpportunities.reduce(
    (sum: number, opportunity: crm_Opportunities) =>
      sum + Number(opportunity.budget),
    0
  );

  return totalAmount;
};
