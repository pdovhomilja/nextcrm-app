"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  verifyTaskAccess,
} from "@/lib/security/company-access-validator";

export const markDone = async (taskId: string) => {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyTaskAccess(taskId, userId, activeCompanyId);

  const task = await db.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw new Error("Task not found");
  }

  const actualBoardSection = await db.boardSection.findFirst({
    where: { id: task.boardSectionId },
  });

  // Prefer a semantic "Done" column if it exists; otherwise fall back to the right-most (highest position)
  const doneSection = await db.boardSection.findFirst({
    where: {
      boardId: actualBoardSection?.boardId,
      name: { equals: "Done", mode: "insensitive" },
    },
  });

  const rightMostSection = await db.boardSection.findFirst({
    where: { boardId: actualBoardSection?.boardId },
    orderBy: { position: "desc" },
  });

  if (!doneSection && !rightMostSection) {
    throw new Error("Destination board section not found");
  }

  const destinationSectionId = (doneSection ?? rightMostSection)!.id;

  // Place the task at the end of the destination section for predictable ordering
  const lastTaskInDestination = await db.task.findFirst({
    where: { boardSectionId: destinationSectionId },
    orderBy: { position: "desc" },
  });

  await db.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      boardSectionId: destinationSectionId,
      position: (lastTaskInDestination?.position ?? -1) + 1,
    },
  });

  const session = await auth();
  revalidatePath(
    `/${session?.user?.activeCompanyId}/tasks/${actualBoardSection?.boardId}`,
  );
};
