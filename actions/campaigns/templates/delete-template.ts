"use server";
import { prismadb } from "@/lib/prisma";

export const deleteTemplate = async (id: string) => {
  return prismadb.crm_campaign_templates.delete({ where: { id } });
};
