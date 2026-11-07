"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  requireAuthenticated,
  assertCanWriteCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const pauseCampaign = async (id: string) => {
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

  const existing = await prismadb.crm_campaigns.findUnique({ where: { id }, select: { status: true, deletedAt: true } });
  if (!existing || existing.deletedAt || (existing.status !== "scheduled" && existing.status !== "sending")) {
    return { error: "Only scheduled or sending campaigns can be paused" };
  }

  const campaign = await prismadb.crm_campaigns.update({
    where: { id },
    data: { status: "paused" },
  });
  await inngest.send({ name: "campaigns/paused", data: { campaignId: id } });
  return campaign;
};
