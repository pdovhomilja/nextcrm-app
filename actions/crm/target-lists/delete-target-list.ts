"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteTargetList = async (targetListId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!targetListId) return { error: "targetListId is required" };

  try {
    await prismadb.crm_TargetLists.delete({ where: { id: targetListId } });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete target list" };
  }
};
