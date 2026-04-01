"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const addTargetsToList = async (targetListId: string, targetIds: string[]) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return { error: "targetIds must be a non-empty array" };
  }

  try {
    const result = await prismadb.targetsToTargetLists.createMany({
      data: targetIds.map((id: string) => ({
        target_id: id,
        target_list_id: targetListId,
      })),
      skipDuplicates: true,
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { added: result.count };
  } catch (error) {
    return { error: "Failed to add targets to list" };
  }
};
