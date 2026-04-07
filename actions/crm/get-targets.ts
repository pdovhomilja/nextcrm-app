"use server";
import { prismadb } from "@/lib/prisma";

export const getTargets = async () => {
  const targets = await prismadb.crm_Targets.findMany({
    where: { deletedAt: null },
    orderBy: { created_on: "desc" },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: { select: { id: true, name: true } } } },
    },
  });
  return targets;
};
