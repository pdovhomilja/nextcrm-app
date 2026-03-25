"use server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export const scheduleCampaign = async (id: string, scheduledAt: Date) => {
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
