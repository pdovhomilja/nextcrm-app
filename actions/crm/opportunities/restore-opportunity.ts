"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const restoreOpportunity = async (opportunityId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!session.user.isAdmin) return { error: "Forbidden" };
  if (!opportunityId) return { error: "opportunityId is required" };

  try {
    await prismadb.crm_Opportunities.update({
      where: { id: opportunityId },
      data: { deletedAt: null, deletedBy: null },
    });
    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunityId,
      action: "restored",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    console.log("[RESTORE_OPPORTUNITY]", error);
    return { error: "Failed to restore opportunity" };
  }
};
