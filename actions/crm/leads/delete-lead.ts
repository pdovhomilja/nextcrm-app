"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteLead,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteLead = async (leadId: string) => {
  if (!leadId) return { error: "leadId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteLead(user, leadId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_Leads.update({
      where: { id: leadId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "lead",
      entityId: leadId,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_LEAD]", error);
    return { error: "Failed to delete lead" };
  }
};
