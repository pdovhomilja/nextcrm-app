import { prismadb } from "@/lib/prisma";

export const NO_FIRST_STEP_MESSAGE = "Campaign has no first step (step 0)";

export async function campaignHasFirstStep(campaignId: string): Promise<boolean> {
  const step = await prismadb.crm_campaign_steps.findFirst({
    where: { campaign_id: campaignId, order: 0 },
    select: { id: true },
  });
  return step !== null;
}
