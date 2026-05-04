"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTemplate,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getTemplate = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadTemplate(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  return prismadb.crm_campaign_templates.findFirst({
    where: { id, deletedAt: null },
    include: { created_by_user: { select: { name: true } } },
  });
};
