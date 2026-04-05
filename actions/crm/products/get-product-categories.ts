import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getProductCategories = cache(async () => {
  const categories = await prismadb.crm_ProductCategories.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  return categories;
});
