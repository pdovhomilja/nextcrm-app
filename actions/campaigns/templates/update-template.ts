"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTemplate,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

// Strict: a server action takes whatever the client posts, the TypeScript type
// below does not exist at runtime.
const updateTemplateSchema = z.strictObject({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject_default: z.string().optional(),
  content_html: z.string().optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
});

export const updateTemplate = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    subject_default: string;
    content_html: string;
    content_json: object;
  }>
) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const parsed = updateTemplateSchema.safeParse(data);
  if (typeof id !== "string" || !parsed.success) return { error: "Invalid input" };

  try {
    await assertCanWriteTemplate(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  return prismadb.crm_campaign_templates.update({ where: { id }, data: parsed.data });
};
