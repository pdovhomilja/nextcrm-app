"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AddOpportunityLineItem } from "./schema";
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
  const {
    opportunityId, productId, name, sku, description,
    quantity, unit_price, discount_type, discount_value, sort_order,
  } = data;

  try {
    const opportunity = await prismadb.crm_Opportunities.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity || opportunity.deletedAt) {
      return { error: "Opportunity not found" };
    }

    let snapshotName = name;
    let snapshotSku = sku;
    let snapshotPrice = parseFloat(unit_price);

    if (productId) {
      const product = await prismadb.crm_Products.findUnique({
        where: { id: productId },
      });
      if (product && !product.deletedAt && product.status === "ACTIVE") {
        snapshotName = name || product.name;
        snapshotSku = sku || product.sku || undefined;
        if (!unit_price || unit_price === "0") {
          snapshotPrice = Number(product.unit_price);
        }
      }
    }

    const discountVal = parseFloat(discount_value) || 0;
    if (discount_type === "PERCENTAGE" && discountVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(quantity, snapshotPrice, discount_type, discountVal);

    const lineItem = await prismadb.crm_OpportunityLineItems.create({
      data: {
        opportunityId,
        productId: productId || undefined,
        name: snapshotName,
        sku: snapshotSku || undefined,
        description: description || undefined,
        quantity,
        unit_price: snapshotPrice,
        discount_type,
        discount_value: discountVal,
        line_total: lineTotal,
        currency: opportunity.currency || "EUR",
        sort_order,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const allLineItems = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Opportunities.update({
      where: { id: opportunityId },
      data: { expected_revenue: newTotal },
    });

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: lineItem.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[ADD_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to add line item" };
  }
};

export const addOpportunityLineItem = createSafeAction(AddOpportunityLineItem, handler);
