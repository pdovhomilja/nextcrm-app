"use server";
import { prismadb } from "@/lib/prisma";

export const deleteCampaign = async (id: string) => {
  return prismadb.crm_campaigns.update({ where: { id }, data: { status: "deleted" } });
};
