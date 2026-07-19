"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { convertTarget } from "./convert-target";
import { handleStageTransition } from "@/lib/crm/stage-transition";

export async function convertTargetToDeal(
  targetId: string
): Promise<
  { accountId: string; contactId: string; opportunityId: string } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  const userId = (session.user as any).id;

  const converted = await convertTarget(targetId);
  if ("error" in converted) return converted;

  try {
    const target = await prismadb.crm_Targets.findFirst({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) return { error: "Target not found" };

    // Idempotency: if an opportunity already exists for this account/contact
    // (e.g. the button was clicked twice), return it instead of duplicating.
    const existing = await prismadb.crm_Opportunities.findFirst({
      where: {
        account: converted.accountId,
        contact: converted.contactId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return { ...converted, opportunityId: existing.id };

    // Campaign attribution: the campaign that last emailed this target, if any.
    const lastSend = await prismadb.crm_campaign_sends.findFirst({
      where: { target_id: targetId },
      orderBy: { sent_at: "desc" },
      select: { campaign_id: true },
    });

    // Entry stage = lowest order (the AQUNAMA runbook configures "Pre-Sale" as order 0).
    const entryStage = await prismadb.crm_Opportunities_Sales_Stages.findFirst({
      orderBy: { order: "asc" },
    });

    const opportunity = await prismadb.crm_Opportunities.create({
      data: {
        name: `${target.company || target.last_name} — inbound`,
        account: converted.accountId,
        contact: converted.contactId,
        campaign: lastSend?.campaign_id ?? undefined,
        sales_stage: entryStage?.id ?? undefined,
        stage_entered_at: new Date(),
        assigned_to: userId,
        createdBy: userId,
        updatedBy: userId,
        last_activity_by: userId,
        last_activity: new Date(),
        status: "ACTIVE",
      },
    });

    await handleStageTransition({
      opportunityId: opportunity.id,
      fromStage: null,
      toStage: opportunity.sales_stage ?? null,
    });

    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunity.id,
      action: "created",
      changes: null,
      userId,
    });
    void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunity.id } });

    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    revalidatePath("/[locale]/(routes)/campaigns/targets", "page");

    return { ...converted, opportunityId: opportunity.id };
  } catch (error) {
    console.error("[convertTargetToDeal] Error:", error);
    return { error: "Failed to create opportunity from target" };
  }
}
