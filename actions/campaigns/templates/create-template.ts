"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

// Strict: a server action takes whatever the client posts, the TypeScript type
// below does not exist at runtime.
const createTemplateSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().optional(),
  subject_default: z.string().optional(),
  content_html: z.string(),
  content_json: z.record(z.string(), z.unknown()),
});

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

  const parsed = createTemplateSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  return prismadb.crm_campaign_templates.create({
    data: { ...parsed.data, created_by: user.id },
  });
};
