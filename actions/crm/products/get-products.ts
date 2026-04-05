import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getProductsFull = cache(async () => {
  const products = await prismadb.crm_Products.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      created_by_user: { select: { id: true, name: true } },
      _count: { select: { accountProducts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return products;
});
