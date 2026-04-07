"use server";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export const deleteTemplate = async (id: string) => {
  const session = await getSession();
  return prismadb.crm_campaign_templates.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: session?.user.id },
  });
};
