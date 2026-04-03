"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const restoreContract = async (contractId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };
  if (!contractId) return { error: "contractId is required" };

  try {
    await prismadb.crm_Contracts.update({
      where: { id: contractId },
      data: { deletedAt: null, deletedBy: null },
    });
    await writeAuditLog({
      entityType: "contract",
      entityId: contractId,
      action: "restored",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/contracts", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    console.log("[RESTORE_CONTRACT]", error);
    return { error: "Failed to restore contract" };
  }
};
