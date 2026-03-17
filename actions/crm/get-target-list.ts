"use server";
import { prismadb } from "@/lib/prisma";

export const getTargetList = async (id: string) => {
  const targetList = await prismadb.crm_TargetLists.findUnique({
    where: { id },
    include: {
      crate_by_user: { select: { name: true } },
      targets: { include: { target: true } },
    },
  });
  return targetList;
};
