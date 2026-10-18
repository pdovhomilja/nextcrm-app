"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError, isUnhandledRole } from "@/lib/authz";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  // Not a partner module: refuse partners and roles without rules (partner-role spec, ticket 4).
  if (isUnhandledRole(user)) return { error: "Forbidden" };

  return prismadb.crm_campaign_templates.create({
    data: { ...data, created_by: user.id },
  });
};
