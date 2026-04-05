"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateOpportunityLineItem } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { calculateLineTotal, sumLineTotals } from "@/lib/line-items";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_OpportunityLineItems.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Line item not found" };
    }

    const qty = updateData.quantity ?? existing.quantity;
    const price = updateData.unit_price ? parseFloat(updateData.unit_price) : Number(existing.unit_price);
    const discType = updateData.discount_type ?? existing.discount_type;
    const discVal = updateData.discount_value !== undefined ? parseFloat(updateData.discount_value) : Number(existing.discount_value);

    if (discType === "PERCENTAGE" && discVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(qty, price, discType, discVal);

    const lineItem = await prismadb.crm_OpportunityLineItems.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
        ...(updateData.unit_price !== undefined && { unit_price: price }),
        ...(updateData.discount_type !== undefined && { discount_type: updateData.discount_type }),
        ...(updateData.discount_value !== undefined && { discount_value: discVal }),
        ...(updateData.sort_order !== undefined && { sort_order: updateData.sort_order }),
        line_total: lineTotal,
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    const allLineItems = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId: existing.opportunityId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Opportunities.update({
      where: { id: existing.opportunityId },
      data: { expected_revenue: newTotal },
    });

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: lineItem.id,
      action: "updated",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[UPDATE_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to update line item" };
  }
};

export const updateOpportunityLineItem = createSafeAction(UpdateOpportunityLineItem, handler);
