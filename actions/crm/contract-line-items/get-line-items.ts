import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getContractLineItems = cache(async (contractId: string) => {
  return prismadb.crm_ContractLineItems.findMany({
    where: { contractId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
