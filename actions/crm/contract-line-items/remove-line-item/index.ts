"use server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";
import {
  requireAuthenticated,
  assertCanWriteContractLineItem,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const removeContractLineItem = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteContractLineItem(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
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
      userId: user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[REMOVE_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to remove line item" };
  }
};
