"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const markTaskDone = async (taskId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!taskId) return { error: "Missing task ID" };

  try {
    await prismadb.tasks.update({
      where: { id: taskId },
      data: {
        taskStatus: "COMPLETE",
        updatedBy: session.user.id,
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[MARK_TASK_DONE]", error);
    return { error: "Failed to mark task as done" };
  }
};
