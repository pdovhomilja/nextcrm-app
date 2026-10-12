"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireFeature,
  assertCanWriteCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteCampaign = async (id: string) => {
  let user;
  try {
    user = await requireFeature("campaigns", "delete");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  try {
    await assertCanWriteCampaign(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  return prismadb.crm_campaigns.update({ where: { id }, data: { status: "deleted" } });
};
