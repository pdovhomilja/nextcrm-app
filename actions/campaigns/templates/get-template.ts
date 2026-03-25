"use server";
import { prismadb } from "@/lib/prisma";

export const getTemplate = async (id: string) => {
  return prismadb.crm_campaign_templates.findUnique({
    where: { id },
    include: { created_by_user: { select: { name: true } } },
  });
};
