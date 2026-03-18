"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export const unwatchAccount = async (accountId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!accountId) return { error: "accountId is required" };

  try {
    await prismadb.crm_Accounts.update({
      where: { id: accountId },
      data: {
        watchers: junctionTableHelpers.removeAccountWatcher(
          accountId,
          session.user.id
        ),
      },
    });
    return { success: true };
  } catch (error) {
    console.log("[UNWATCH_ACCOUNT]", error);
    return { error: "Failed to unwatch account" };
  }
};
