"use server";
import { prismadb } from "@/lib/prisma";

export const getTemplates = async () => {
  return prismadb.crm_campaign_templates.findMany({
    where: { deletedAt: null },
    orderBy: { created_on: "desc" },
    include: { created_by_user: { select: { name: true } } },
  });
};
