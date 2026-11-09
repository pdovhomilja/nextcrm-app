"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  requireRole,
  assertCanReadCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { campaignHasFirstStep, NO_FIRST_STEP_MESSAGE } from "@/lib/campaigns/first-step";

export const sendCampaignNow = async (id: string) => {
  let user;
  try {
    user = await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await assertCanReadCampaign(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  const existing = await prismadb.crm_campaigns.findUnique({ where: { id }, select: { status: true } });
  if (!["draft", "scheduled"].includes(existing?.status ?? "")) {
    return { error: `Cannot send campaign in status: ${existing?.status}` };
  }

  if (!(await campaignHasFirstStep(id))) return { error: NO_FIRST_STEP_MESSAGE };

  const now = new Date();
  // Conditional write: of two simultaneous calls only one moves the campaign and emits.
  const { count } = await prismadb.crm_campaigns.updateMany({
    where: { id, status: { in: ["draft", "scheduled"] } },
    data: { status: "sending", scheduled_at: now },
  });
  if (count === 0) return { error: "Cannot send campaign in status: sending" };

  await inngest.send({
    name: "campaigns/send-now",
    data: { campaignId: id },
  });
};
