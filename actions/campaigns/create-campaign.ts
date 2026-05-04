"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTemplate,
  targetListReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

type StepInput = {
  order: number;
  template_id: string;
  subject: string;
  delay_days: number;
  send_to: "all" | "non_openers";
};

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

  if (data.template_id) {
    try {
      await assertCanReadTemplate(user, data.template_id);
    } catch (e) {
      if (e instanceof AuthorizationError) return { error: "Forbidden" };
      throw e;
    }
  }

  if (data.target_list_ids?.length) {
    const accessible = await prismadb.crm_TargetLists.findMany({
      where: {
        id: { in: data.target_list_ids },
        ...targetListReadScopeWhere(user),
      },
      select: { id: true },
    });
    if (accessible.length !== data.target_list_ids.length) {
      return { error: "Forbidden" };
    }
  }

  const { target_list_ids, steps, ...campaignData } = data;

  return prismadb.crm_campaigns.create({
    data: {
      ...campaignData,
      v: 0,
      status: data.scheduled_at ? "scheduled" : "draft",
      created_by: user.id,
      target_lists: {
        create: target_list_ids.map((id) => ({ target_list_id: id })),
      },
      steps: {
        create: steps.map((s) => ({
          ...s,
          scheduled_at: data.scheduled_at
            ? new Date(data.scheduled_at.getTime() + s.delay_days * 86_400_000)
            : null,
        })),
      },
    },
  });
};
