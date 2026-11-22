"use server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTemplate,
  targetListReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { NO_FIRST_STEP_MESSAGE } from "@/lib/campaigns/first-step";

type StepInput = {
  order: number;
  template_id: string;
  subject: string;
  delay_days: number;
  send_to: "all" | "non_openers";
};

// Strict: a server action takes whatever the client posts, the TypeScript type
// below does not exist at runtime.
const createCampaignSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().optional(),
  from_name: z.string().optional(),
  reply_to: z.string().optional(),
  template_id: z.string().optional(),
  target_list_ids: z.array(z.string()),
  steps: z.array(
    z.strictObject({
      order: z.number().int(),
      template_id: z.string(),
      subject: z.string(),
      delay_days: z.number().int(),
      send_to: z.enum(["all", "non_openers"]),
    })
  ),
  scheduled_at: z.date().optional(),
});

export const createCampaign = async (data: {
  name: string;
  description?: string;
  from_name?: string;
  reply_to?: string;
  template_id?: string;
  target_list_ids: string[];
  steps: StepInput[];
  scheduled_at?: Date;
}) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const parsed = createCampaignSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };
  const input = parsed.data;

  // A campaign stored as "scheduled" must have the step it starts with.
  if (input.scheduled_at && !input.steps.some((s) => s.order === 0)) {
    return { error: NO_FIRST_STEP_MESSAGE };
  }

  if (input.template_id) {
    try {
      await assertCanReadTemplate(user, input.template_id);
    } catch (e) {
      if (e instanceof AuthorizationError) return { error: "Forbidden" };
      throw e;
    }
  }

  for (const templateId of Array.from(new Set(input.steps.map((s) => s.template_id)))) {
    try {
      await assertCanReadTemplate(user, templateId);
    } catch (e) {
      if (e instanceof AuthorizationError) return { error: "Forbidden" };
      throw e;
    }
  }

  if (input.target_list_ids?.length) {
    const accessible = await prismadb.crm_TargetLists.findMany({
      where: {
        id: { in: input.target_list_ids },
        ...targetListReadScopeWhere(user),
      },
      select: { id: true },
    });
    if (accessible.length !== input.target_list_ids.length) {
      return { error: "Forbidden" };
    }
  }

  const { target_list_ids, steps, ...campaignData } = input;

  return prismadb.crm_campaigns.create({
    data: {
      ...campaignData,
      v: 0,
      status: input.scheduled_at ? "scheduled" : "draft",
      created_by: user.id,
      target_lists: {
        create: target_list_ids.map((id) => ({ target_list_id: id })),
      },
      steps: {
        create: steps.map((s) => ({
          ...s,
          scheduled_at: input.scheduled_at
            ? new Date(input.scheduled_at.getTime() + s.delay_days * 86_400_000)
            : null,
        })),
      },
    },
  });
};
