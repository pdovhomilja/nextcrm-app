"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

/** Admins and managers name the account's external partner (a user with role partner), or clear it with null. */
export const setAccountPartner = async (accountId: string, partnerUserId: string | null) => {
  let actor;
  try {
    actor = await requireRole(["admin", "manager"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (!accountId) return { error: "accountId is required" };

  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true, partnerUserId: true },
  });
  if (!account) return { error: "Account not found" };

  if (partnerUserId) {
    const partner = await prismadb.users.findUnique({
      where: { id: partnerUserId },
      select: { role: true },
    });
    if (partner?.role !== "partner") return { error: "User is not a partner" };
  }

  try {
    const updated = await prismadb.crm_Accounts.update({
      where: { id: accountId },
      data: { partnerUserId, updatedBy: actor.id },
      select: { id: true, partnerUserId: true },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: accountId,
      action: "updated",
      changes: [{ field: "partnerUserId", old: account.partnerUserId, new: partnerUserId }],
      userId: actor.id,
    });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: updated };
  } catch (error) {
    console.log("[SET_ACCOUNT_PARTNER]", error);
    return { error: "Failed to update account partner" };
  }
};
