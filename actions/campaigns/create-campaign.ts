"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

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
  const session = await getSession();
  const { target_list_ids, steps, ...campaignData } = data;

  return prismadb.crm_campaigns.create({
    data: {
      ...campaignData,
      v: 0,
      status: data.scheduled_at ? "scheduled" : "draft",
      created_by: session?.user?.id ?? null,
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
