"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  targetListReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getTargetLists = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const targetLists = await prismadb.crm_TargetLists.findMany({
    where: { ...targetListReadScopeWhere(user) },
    orderBy: { created_on: "desc" },
    include: {
      crate_by_user: { select: { name: true } },
      _count: { select: { targets: true } },
    },
  });
  return targetLists;
};
