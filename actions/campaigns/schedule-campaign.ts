"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  requireRole,
  assertCanReadCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const scheduleCampaign = async (id: string, scheduledAt: Date) => {
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

  const campaign = await prismadb.crm_campaigns.update({
    where: { id },
    data: {
      status: "scheduled",
      scheduled_at: scheduledAt,
      steps: {
        updateMany: {
          where: { order: 0 },
          data: { scheduled_at: scheduledAt },
        },
      },
    },
  });

  await inngest.send({
    name: "campaigns/schedule",
    data: { campaignId: id, scheduledAt: scheduledAt.toISOString() },
  });

  return campaign;
};
