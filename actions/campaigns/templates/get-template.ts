"use server";
import { prismadb } from "@/lib/prisma";

export const getTemplate = async (id: string) => {
  return prismadb.crm_campaign_templates.findFirst({
    where: { id, deletedAt: null },
    include: { created_by_user: { select: { name: true } } },
  });
};
