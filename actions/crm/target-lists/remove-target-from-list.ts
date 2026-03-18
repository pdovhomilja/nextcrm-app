"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const removeTargetFromList = async (targetListId: string, targetId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!targetId) return { error: "targetId is required" };

  try {
    await prismadb.targetsToTargetLists.delete({
      where: {
        target_id_target_list_id: {
          target_id: targetId,
          target_list_id: targetListId,
        },
      },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to remove target from list" };
  }
};
