"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteContract,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const reorderContractLineItems = async (
  items: { id: string; sort_order: number }[]
) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  // No parent id is supplied; resolve every line item's parent and require
  // write on each. Any unresolved id or unwritable parent fails the batch.
  const ids = items.map((i) => i.id);
  const rows = await prismadb.crm_ContractLineItems.findMany({
    where: { id: { in: ids } },
    select: { id: true, contractId: true },
  });
  const foundIds = new Set(rows.map((r) => r.id));
  if (ids.some((id) => !foundIds.has(id))) return { error: "Forbidden" };
  const parents = Array.from(new Set(rows.map((r) => r.contractId)));
  try {
    for (const contractId of parents) await assertCanWriteContract(user, contractId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.$transaction(
      items.map((item) =>
        prismadb.crm_ContractLineItems.update({
          where: { id: item.id },
          data: { sort_order: item.sort_order },
        })
      )
    );

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { success: true } };
  } catch (error) {
    console.log("[REORDER_CONTRACT_LINE_ITEMS]", error);
    return { error: "Failed to reorder line items" };
  }
};
