"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireFeature,
  assertCanWriteTemplate,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteTemplate = async (id: string) => {
  let user;
  try {
    user = await requireFeature("campaigns", "delete");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  try {
    await assertCanWriteTemplate(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  return prismadb.crm_campaign_templates.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: user.id },
  });
};
