"use server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  const session = await getServerSession(authOptions);
  return prismadb.crm_campaign_templates.create({
    data: { ...data, created_by: session?.user?.id ?? null },
  });
};
