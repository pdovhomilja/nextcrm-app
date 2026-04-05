import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getOpportunityLineItems = cache(async (opportunityId: string) => {
  return prismadb.crm_OpportunityLineItems.findMany({
    where: { opportunityId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
