"use server";
import { prismadb } from "@/lib/prisma";
import { requireFeature, AuthenticationError, AuthorizationError } from "@/lib/authz";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  let user;
  try {
    user = await requireFeature("campaigns", "create");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  return prismadb.crm_campaign_templates.create({
    data: { ...data, created_by: user.id },
  });
};
