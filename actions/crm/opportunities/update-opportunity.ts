"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";

export const updateOpportunity = async (data: {
  id: string;
  account?: string;
  assigned_to?: string;
  budget?: string;
  campaign?: string | null;
  close_date?: Date;
  contact?: string;
  currency?: string;
  description?: string;
  expected_revenue?: string;
  name?: string;
  next_step?: string;
  sales_stage?: string;
  type?: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;
  const {
    id,
    account,
    assigned_to,
    budget,
    campaign,
    close_date,
    contact,
    currency,
    description,
    expected_revenue,
    name,
    next_step,
    sales_stage,
    type,
  } = data;

  if (!id) return { error: "id is required" };

  try {
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;
    const before = await prismadb.crm_Opportunities.findUnique({ where: { id, deletedAt: null } });
    const opportunity = await prismadb.crm_Opportunities.update({
      where: { id },
      data: {
        account: account || undefined,
        assigned_to: assigned_to || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        campaign: campaign || undefined,
        close_date,
        contact: contact || undefined,
        updatedBy: userId,
        currency,
        description,
        expected_revenue: expected_revenue ? parseFloat(expected_revenue) : undefined,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
        name,
        next_step,
        sales_stage: sales_stage || undefined,
        status: "ACTIVE",
        type: type || undefined,
      },
    });
    const serialize = (obj: any) => JSON.parse(JSON.stringify(obj, (_, v) => typeof v === "bigint" ? v.toString() : v));
    const changes = before ? diffObjects(serialize(before), serialize(opportunity)) : null;
    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunity.id,
      action: "updated",
      changes,
      userId: session.user.id,
    });
    void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunity.id } });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    return { data: serialize(opportunity) };
  } catch (error) {
    console.log("[UPDATE_OPPORTUNITY]", error);
    return { error: "Failed to update opportunity" };
  }
};
