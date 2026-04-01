"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const addComment = async (data: {
  taskId: string;
  comment: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { taskId, comment } = data;

  if (!taskId) return { error: "taskId is required" };
  if (!comment) return { error: "comment is required" };

  try {
    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "Task not found" };

    const newComment = await prismadb.tasksComments.create({
      data: {
        v: 0,
        comment,
        task: taskId,
        user: session.user.id,
      },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { data: newComment };
  } catch (error) {
    console.log("[ADD_COMMENT]", error);
    return { error: "Failed to add comment" };
  }
};
