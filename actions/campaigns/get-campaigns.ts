"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  campaignReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getCampaigns = async (filters?: { status?: string; search?: string }) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  return prismadb.crm_campaigns.findMany({
    where: {
      ...campaignReadScopeWhere(user),
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
