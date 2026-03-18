"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteTarget = async (targetId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!targetId) return { error: "targetId is required" };

  try {
    await prismadb.crm_Targets.delete({ where: { id: targetId } });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete target" };
  }
};
