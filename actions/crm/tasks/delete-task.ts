"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteTask = async (taskId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!taskId) return { error: "taskId is required" };

  try {
    await prismadb.tasksComments.deleteMany({
      where: { task: taskId },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: { id: taskId },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_TASK]", error);
    return { error: "Failed to delete task" };
  }
};
