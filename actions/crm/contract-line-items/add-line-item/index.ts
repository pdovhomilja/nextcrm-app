"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AddContractLineItem } from "./schema";
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
    contractId, productId, name, sku, description,
    quantity, unit_price, discount_type, discount_value, sort_order,
  } = data;

  try {
    const contract = await prismadb.crm_Contracts.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.deletedAt) {
      return { error: "Contract not found" };
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

    const lineItem = await prismadb.crm_ContractLineItems.create({
      data: {
        contractId,
        productId: productId || undefined,
        name: snapshotName,
        sku: snapshotSku || undefined,
        description: description || undefined,
        quantity,
        unit_price: snapshotPrice,
        discount_type,
        discount_value: discountVal,
        line_total: lineTotal,
        currency: contract.currency || "EUR",
        sort_order,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const allLineItems = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Contracts.update({
      where: { id: contractId },
      data: { value: newTotal },
    });

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: lineItem.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[ADD_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to add line item" };
  }
};

export const addContractLineItem = createSafeAction(AddContractLineItem, handler);
