"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTargetList,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getTargetList = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadTargetList(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  const targetList = await prismadb.crm_TargetLists.findUnique({
    where: { id },
    include: {
      crate_by_user: { select: { name: true } },
      targets: { include: { target: true } },
    },
  });
  return targetList;
};
