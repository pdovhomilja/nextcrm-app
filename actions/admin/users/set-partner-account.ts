"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

/** Admin sets (or clears with null) a partner's own company account. */
export const setPartnerAccount = async (userId: string, accountId: string | null) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (!userId) return { error: "userId is required" };

  const target = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true, partnerAccountId: true },
  });
  if (!target) return { error: "User not found" };
  if (target.role !== "partner") return { error: "User is not a partner" };

  if (accountId) {
    const account = await prismadb.crm_Accounts.findFirst({
      where: { id: accountId, deletedAt: null },
      select: { id: true },
    });
    if (!account) return { error: "Account not found" };
  }

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { partnerAccountId: accountId },
      select: { id: true, partnerAccountId: true },
    });
    await writeAuditLog({
      entityType: "user",
      entityId: userId,
      action: "updated",
      changes: [{ field: "partnerAccountId", old: target.partnerAccountId, new: accountId }],
      userId: actor.id,
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_PARTNER_ACCOUNT]", error);
    return { error: "Failed to update partner account" };
  }
};
