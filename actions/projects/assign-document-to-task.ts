"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const assignDocumentToTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "Task not found" };

    await prismadb.documentsToTasks.create({
      data: {
        document_id: documentId,
        task_id: taskId,
      },
    });

    await prismadb.tasks.update({
      where: { id: taskId },
      data: { updatedBy: session.user.id },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[ASSIGN_DOCUMENT_TO_TASK]", error);
    return { error: "Failed to assign document to task" };
  }
};

export const disconnectDocumentFromTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "Task not found" };

    await prismadb.documentsToTasks.delete({
      where: {
        document_id_task_id: {
          document_id: documentId,
          task_id: taskId,
        },
      },
    });

    const updatedTask = await prismadb.tasks.update({
      where: { id: taskId },
      data: { updatedBy: session.user.id },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { data: updatedTask };
  } catch (error) {
    console.log("[DISCONNECT_DOCUMENT_FROM_TASK]", error);
    return { error: "Failed to disconnect document from task" };
  }
};
