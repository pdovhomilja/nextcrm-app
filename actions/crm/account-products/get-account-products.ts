import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getAccountProducts = cache(async (accountId: string) => {
  const assignments = await prismadb.crm_AccountProducts.findMany({
    where: { accountId },
    include: {
      product: {
        select: { id: true, name: true, sku: true, type: true, status: true, unit_price: true, unit: true, is_recurring: true, billing_period: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return assignments;
});
