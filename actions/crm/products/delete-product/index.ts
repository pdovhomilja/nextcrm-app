"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

export const deleteProduct = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prismadb.crm_Products.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[DELETE_PRODUCT]", error);
    return { error: "Failed to delete product" };
  }
};
