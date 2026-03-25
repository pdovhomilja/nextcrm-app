"use server";
import { prismadb } from "@/lib/prisma";

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
  return prismadb.crm_campaigns.update({ where: { id }, data });
};
