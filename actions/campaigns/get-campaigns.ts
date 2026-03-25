"use server";
import { prismadb } from "@/lib/prisma";

export const getCampaigns = async (filters?: { status?: string; search?: string }) => {
  return prismadb.crm_campaigns.findMany({
    where: {
      status: { not: "deleted" },
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    },
    orderBy: { created_on: "desc" },
    include: {
      template: { select: { name: true } },
      created_by_user: { select: { name: true } },
      _count: { select: { sends: true } },
    },
  });
};
