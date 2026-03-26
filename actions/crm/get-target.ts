"use server";
import { prismadb } from "@/lib/prisma";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getTarget = async (targetId: string) => {
  if (!UUID_REGEX.test(targetId)) return null;

  const target = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: true } },
    },
  });
  return target;
};
