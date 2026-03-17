"use server";
import { prismadb } from "@/lib/prisma";

export const getTargetLists = async () => {
  const targetLists = await prismadb.crm_TargetLists.findMany({
    orderBy: { created_on: "desc" },
    include: {
      crate_by_user: { select: { name: true } },
      _count: { select: { targets: true } },
    },
  });
  return targetLists;
};
