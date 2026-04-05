"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";

export const removeOpportunityLineItem = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const lineItem = await prismadb.crm_OpportunityLineItems.findUnique({ where: { id } });
    if (!lineItem) {
      return { error: "Line item not found" };
    }

    await prismadb.crm_OpportunityLineItems.delete({ where: { id } });

    const remaining = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId: lineItem.opportunityId },
    });
    if (remaining.length > 0) {
      const newTotal = sumLineTotals(remaining);
      await prismadb.crm_Opportunities.update({
        where: { id: lineItem.opportunityId },
        data: { expected_revenue: newTotal },
      });
    }

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[REMOVE_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to remove line item" };
  }
};
