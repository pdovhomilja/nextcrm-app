"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateProduct } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_Products.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { error: "Product not found" };
    }

    if (updateData.sku && updateData.sku !== existing.sku) {
      const skuExists = await prismadb.crm_Products.findUnique({ where: { sku: updateData.sku } });
      if (skuExists) {
        return { error: `A product with SKU "${updateData.sku}" already exists` };
      }
    }

    const willBeRecurring = updateData.is_recurring ?? existing.is_recurring;
    const billingPeriod = updateData.billing_period !== undefined ? updateData.billing_period : existing.billing_period;
    if (willBeRecurring && !billingPeriod) {
      return { error: "Billing period is required for recurring products" };
    }

    const product = await prismadb.crm_Products.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.sku !== undefined && { sku: updateData.sku || null }),
        ...(updateData.type !== undefined && { type: updateData.type }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.unit_price !== undefined && { unit_price: parseFloat(updateData.unit_price) }),
        ...(updateData.unit_cost !== undefined && { unit_cost: updateData.unit_cost ? parseFloat(updateData.unit_cost) : null }),
        ...(updateData.currency !== undefined && { currency: updateData.currency }),
        ...(updateData.tax_rate !== undefined && { tax_rate: updateData.tax_rate ? parseFloat(updateData.tax_rate) : null }),
        ...(updateData.unit !== undefined && { unit: updateData.unit || null }),
        ...(updateData.is_recurring !== undefined && { is_recurring: updateData.is_recurring }),
        ...(updateData.billing_period !== undefined && { billing_period: !willBeRecurring ? null : updateData.billing_period }),
        ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId || null }),
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: product.id,
      action: "updated",
      changes: updateData,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    revalidatePath(`/[locale]/(routes)/crm/products/${id}`, "page");
    return { data: { id: product.id, name: product.name } };
  } catch (error) {
    console.log("[UPDATE_PRODUCT]", error);
    return { error: "Failed to update product" };
  }
};

export const updateProduct = createSafeAction(UpdateProduct, handler);
