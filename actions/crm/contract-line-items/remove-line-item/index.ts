"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";

export const removeContractLineItem = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const lineItem = await prismadb.crm_ContractLineItems.findUnique({ where: { id } });
    if (!lineItem) {
      return { error: "Line item not found" };
    }

    await prismadb.crm_ContractLineItems.delete({ where: { id } });

    const remaining = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId: lineItem.contractId },
    });
    if (remaining.length > 0) {
      const newTotal = sumLineTotals(remaining);
      await prismadb.crm_Contracts.update({
        where: { id: lineItem.contractId },
        data: { value: newTotal },
      });
    }

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[REMOVE_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to remove line item" };
  }
};
