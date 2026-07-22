"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import sendEmail from "@/lib/sendmail";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
import { handleStageTransition } from "@/lib/crm/stage-transition";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const createOpportunity = async (data: {
  account?: string;
  assigned_to?: string;
  budget?: string;
  campaign?: string;
  close_date?: Date;
  delivery_deadline?: Date;
  contact?: string;
  currency?: string;
  description?: string;
  expected_revenue?: string;
  name: string;
  next_step?: string;
  sales_stage?: string;
  type?: string;
}) => {
  const {
    account,
    assigned_to,
    budget,
    campaign,
    close_date,
    delivery_deadline,
    contact,
    currency,
    description,
    expected_revenue,
    name,
    next_step,
    sales_stage,
    type,
  } = data;

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    // Parent-write: attaching the opportunity to an account requires write on it.
    if (account) await assertCanWriteAccount(user, account);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  const userId = user.id;

  try {
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
    const opportunity = await prismadb.crm_Opportunities.create({
      data: {
        account: account || undefined,
        assigned_to: assigned_to || userId,
        budget: budget ? parseFloat(budget) : undefined,
        campaign: campaign || undefined,
        close_date,
        delivery_deadline,
        contact: contact || undefined,
        createdBy: userId,
        last_activity_by: userId,
        updatedBy: userId,
        currency: currency || undefined,
        description: description || undefined,
        expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
        name,
        next_step: next_step || undefined,
        sales_stage: sales_stage || undefined,
        stage_entered_at: new Date(),
        status: "ACTIVE",
        type: type || undefined,
      },
    });

    await handleStageTransition({
      opportunityId: opportunity.id,
      fromStage: null,
      toStage: opportunity.sales_stage ?? null,
    });

    if (assigned_to && assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: { id: assigned_to },
      });

      if (notifyRecipient) {
        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: notifyRecipient.email || "info@softbase.cz",
          subject:
            notifyRecipient.userLanguage === "en"
              ? `New opportunity ${name} has been added to the system and assigned to you.`
              : `Nová příležitost ${name} byla přidána do systému a přidělena vám.`,
          text:
            notifyRecipient.userLanguage === "en"
              ? `New opportunity ${name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${opportunity.id}`
              : `Nová příležitost ${name} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${opportunity.id}`,
        });
      }
    }

    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunity.id,
      action: "created",
      changes: null,
      userId: user.id,
    });
    void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunity.id } });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    return { data: opportunity };
  } catch (error) {
    console.log("[CREATE_OPPORTUNITY]", error);
    return { error: "Failed to create opportunity" };
  }
};
