"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  campaignTemplateReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getTemplates = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  return prismadb.crm_campaign_templates.findMany({
    where: campaignTemplateReadScopeWhere(user),
    orderBy: { created_on: "desc" },
    include: { created_by_user: { select: { name: true } } },
  });
};
