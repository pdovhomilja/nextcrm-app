"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const reorderOpportunityLineItems = async (
  items: { id: string; sort_order: number }[]
) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prismadb.$transaction(
      items.map((item) =>
        prismadb.crm_OpportunityLineItems.update({
          where: { id: item.id },
          data: { sort_order: item.sort_order },
        })
      )
    );

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { success: true } };
  } catch (error) {
    console.log("[REORDER_OPPORTUNITY_LINE_ITEMS]", error);
    return { error: "Failed to reorder line items" };
  }
};
