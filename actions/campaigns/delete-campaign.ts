"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  requireAuthenticated,
  assertCanWriteCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteCampaign = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  try {
    await assertCanWriteCampaign(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  const existing = await prismadb.crm_campaigns.findUnique({ where: { id }, select: { status: true } });
  if (existing?.status === "sending") return { error: "Cannot delete a campaign that is currently sending" };

  const campaign = await prismadb.crm_campaigns.update({ where: { id }, data: { status: "deleted" } });
  await inngest.send({ name: "campaigns/deleted", data: { campaignId: id } });
  return campaign;
};
