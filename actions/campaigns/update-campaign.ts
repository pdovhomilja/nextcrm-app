"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireFeature,
  assertCanWriteCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateCampaign = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    from_name: string;
    reply_to: string;
    template_id: string;
    scheduled_at: Date;
  }>
) => {
  let user;
  try {
    user = await requireFeature("campaigns", "edit");
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

  return prismadb.crm_campaigns.update({ where: { id }, data });
};
