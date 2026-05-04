"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  targetReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getTargets = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const targets = await prismadb.crm_Targets.findMany({
    where: { ...targetReadScopeWhere(user) },
    orderBy: { created_on: "desc" },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: { select: { id: true, name: true } } } },
    },
  });
  return targets;
};
