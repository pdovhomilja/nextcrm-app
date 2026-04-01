"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const restoreLead = async (leadId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };
  if (!leadId) return { error: "leadId is required" };

  try {
    await prismadb.crm_Leads.update({
      where: { id: leadId },
      data: { deletedAt: null, deletedBy: null },
    });
    await writeAuditLog({
      entityType: "lead",
      entityId: leadId,
      action: "restored",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    console.log("[RESTORE_LEAD]", error);
    return { error: "Failed to restore lead" };
  }
};
