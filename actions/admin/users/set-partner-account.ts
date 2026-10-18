"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole, AuthorizationError } from "@/lib/authz";

/** Admin sets (or clears with null) a partner's own company account. */
export const setPartnerAccount = async (userId: string, accountId: string | null) => {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    return { error: "Unauthorized" };
  }

  if (!userId) return { error: "userId is required" };

  const target = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
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
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_PARTNER_ACCOUNT]", error);
    return { error: "Failed to update partner account" };
  }
};
