"use server";
import { prismadb } from "@/lib/prisma";

export const pauseCampaign = async (id: string) => {
  return prismadb.crm_campaigns.update({
    where: { id },
    data: { status: "paused" },
  });
  // Note: in-flight Inngest jobs check campaign.status at execution start
  // and exit early when status is "paused" — no Inngest API cancellation needed.
};
