"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  const session = await getSession();
  return prismadb.crm_campaign_templates.create({
    data: { ...data, created_by: session?.user?.id ?? null },
  });
};
