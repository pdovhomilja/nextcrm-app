"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteOpportunity,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteOpportunity = async (opportunityId: string) => {
  if (!opportunityId) return { error: "opportunityId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteOpportunity(user, opportunityId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_Opportunities.update({
      where: { id: opportunityId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunityId,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_OPPORTUNITY]", error);
    return { error: "Failed to delete opportunity" };
  }
};
