"use server";
import { prismadb } from "@/lib/prisma";

export const getTarget = async (targetId: string) => {
  const target = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: true } },
    },
  });
  return target;
};
