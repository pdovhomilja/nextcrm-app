"use server";

import db from "@/lib/db";
import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import { triggerTaskEmbeddingUpdate } from "@/lib/ai/embedding-triggers";
import type { CreateTaskData, Task } from "@/app/(app)/[cid]/tasks/_types";

export async function createTask(
  task: CreateTaskData,
  boardSectionId: string,
): Promise<Task> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = await getUserByEmail(session.user.email);
    if (!user?.id) {
      throw new Error("User not found");
    }

    // Verify board section exists
    const boardSection = await db.boardSection.findUnique({
      where: { id: boardSectionId },
    });
    if (!boardSection) {
      throw new Error("Board section not found");
    }

    // Get the last position in this board section
    const lastTask = await db.task.findFirst({
      where: {
        boardSectionId: boardSectionId,
      },
      orderBy: {
        position: "desc",
      },
    });

    const newTask = await db.task.create({
      data: {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        priority: task.priority ?? undefined,
        status: task.status ?? undefined,
        position: lastTask ? lastTask.position + 1 : 0,
        assignedToId: user.id,
        createdById: user.id,
        boardSectionId: boardSectionId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Queue embedding generation (non-blocking)
    if (newTask.id) {
      triggerTaskEmbeddingUpdate(newTask.id).catch((error) => {
        console.error("Failed to queue embedding update:", error);
      });
    }

    const taskForClient: Task = {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status as unknown as string,
      priority: newTask.priority as unknown as string,
      dueDate: newTask.dueDate,
      position: newTask.position,
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
      assignedTo: {
        id: newTask.assignedTo?.id ?? user.id,
        name: newTask.assignedTo?.name ?? null,
      },
      createdBy: {
        id: newTask.createdBy?.id ?? user.id,
        name: newTask.createdBy?.name ?? null,
      },
      documents: [],
    };

    return taskForClient;
  } catch (error) {
    throw new Error(
      `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
