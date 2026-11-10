"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteCampaign,
  assertCanReadTemplate,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

// Strict: a server action takes whatever the client posts, the TypeScript type
// below does not exist at runtime.
const updateCampaignSchema = z.strictObject({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  from_name: z.string().optional(),
  reply_to: z.string().email().optional(),
  template_id: z.string().uuid().optional(),
  scheduled_at: z.date().optional(),
});

export const updateCampaign = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    from_name: string;
    reply_to: string;
    template_id: string;
    scheduled_at: Date;
  }>
) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  try {
    await assertCanWriteCampaign(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Not found" };
    throw e;
  }

  const parsed = updateCampaignSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  if (parsed.data.template_id) {
    try {
      await assertCanReadTemplate(user, parsed.data.template_id);
    } catch (e) {
      if (e instanceof AuthorizationError) return { error: "Forbidden" };
      throw e;
    }
  }

  return prismadb.crm_campaigns.update({ where: { id }, data: parsed.data });
};
