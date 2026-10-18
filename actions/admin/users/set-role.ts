"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import { APP_ROLES, AppRole, requireRole, AuthorizationError } from "@/lib/authz";

export const setUserRole = async (userId: string, role: AppRole) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    return { error: "Unauthorized" };
  }

  if (!userId) return { error: "userId is required" };
  if (!APP_ROLES.includes(role)) return { error: "Invalid role" };

  if (userId === actor.id && role !== "admin") {
    return { error: "Cannot remove your own admin role" };
  }

  const select = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
    userLanguage: true,
    userStatus: true,
    lastLoginAt: true,
  };

  try {
    const before = await prismadb.users.findUnique({
      where: { id: userId },
      select: { role: true, partnerAccountId: true },
    });
    let user;
    if (before?.role === "partner" && role !== "partner") {
      // A former partner keeps no partner links: his own account and every
      // account that names him as partner are cleared together.
      const cleared = await prismadb.$transaction(async (tx) => {
        const accounts = await tx.crm_Accounts.findMany({
          where: { partnerUserId: userId },
          select: { id: true },
        });
        await tx.crm_Accounts.updateMany({
          where: { partnerUserId: userId },
          data: { partnerUserId: null, updatedBy: actor.id },
        });
        const updated = await tx.users.update({
          where: { id: userId },
          data: { role, partnerAccountId: null },
          select,
        });
        return { accounts, updated };
      });
      user = cleared.updated;
      await writeAuditLog({
        entityType: "user",
        entityId: userId,
        action: "updated",
        changes: [
          { field: "role", old: before.role, new: role },
          { field: "partnerAccountId", old: before.partnerAccountId, new: null },
        ],
        userId: actor.id,
      });
      for (const account of cleared.accounts) {
        await writeAuditLog({
          entityType: "account",
          entityId: account.id,
          action: "updated",
          changes: [{ field: "partnerUserId", old: userId, new: null }],
          userId: actor.id,
        });
      }
    } else {
      user = await prismadb.users.update({
        where: { id: userId },
        data: { role },
        select,
      });
    }
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_USER_ROLE]", error);
    return { error: "Failed to update user role" };
  }
};
