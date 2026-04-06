"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteTargetList = async (targetListId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!targetListId) return { error: "targetListId is required" };

  try {
    await prismadb.crm_TargetLists.update({
      where: { id: targetListId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete target list" };
  }
};
