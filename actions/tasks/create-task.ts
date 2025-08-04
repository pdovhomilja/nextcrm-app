"use server";

import db from "@/lib/db";
import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import type { CreateTaskData } from "@/app/(app)/[cid]/tasks/_types";

export async function createTask(task: CreateTaskData, boardSectionId: string) {
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
        dueDate: new Date(),
        position: lastTask ? lastTask.position + 1 : 0,
        assignedToId: user.id,
        createdById: user.id,
        boardSectionId: boardSectionId,
      },
      include: {
        assignedTo: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return newTask;
  } catch (error) {
    throw new Error(
      `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
