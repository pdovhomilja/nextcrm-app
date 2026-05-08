"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getTarget = async (targetId: string) => {
  if (!UUID_REGEX.test(targetId)) return null;

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  const target = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    include: {
      crate_by_user: { select: { name: true } },
      target_lists: { include: { target_list: true } },
      target_contacts: {
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          phone: true,
          linkedinUrl: true,
          source: true,
          enrichStatus: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return target;
};
