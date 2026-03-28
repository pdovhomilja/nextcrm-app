"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";

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
  const session = await getServerSession(authOptions);
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
    const before = await prismadb.crm_Opportunities.findUnique({ where: { id, deletedAt: null } });
    const opportunity = await prismadb.crm_Opportunities.update({
      where: { id },
      data: {
        account,
        assigned_to,
        budget: budget ? Number(budget) : undefined,
        campaign,
        close_date,
        contact,
        updatedBy: userId,
        currency,
        description,
        expected_revenue: expected_revenue ? Number(expected_revenue) : undefined,
        name,
        next_step,
        sales_stage,
        status: "ACTIVE",
        type,
      },
    });
    const changes = before ? diffObjects(before as Record<string, unknown>, opportunity as Record<string, unknown>) : null;
    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunity.id,
      action: "updated",
      changes,
      userId: session.user.id,
    });
    void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunity.id } });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    return { data: opportunity };
  } catch (error) {
    console.log("[UPDATE_OPPORTUNITY]", error);
    return { error: "Failed to update opportunity" };
  }
};
