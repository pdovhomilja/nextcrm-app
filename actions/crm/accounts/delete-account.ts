"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteAccount = async (accountId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!accountId) return { error: "accountId is required" };

  try {
    await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_ACCOUNT]", error);
    return { error: "Failed to delete account" };
  }
};
