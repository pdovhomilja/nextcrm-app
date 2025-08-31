"use server";

import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export const markDone = async (taskId: string) => {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("User session or email not found");
  }

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) {
    throw new Error("User not found");
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw new Error("Task not found");
  }

  const actualBoardSection = await db.boardSection.findFirst({
    where: {
      id: task.boardSectionId,
    },
  });

  console.log("Actual board section:", actualBoardSection?.id);

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
  console.log("Destination board section:", destinationSectionId);

  // Place the task at the end of the destination section for predictable ordering
  const lastTaskInDestination = await db.task.findFirst({
    where: { boardSectionId: destinationSectionId },
    orderBy: { position: "desc" },
  });

  const res = await db.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      boardSectionId: destinationSectionId,
      position: (lastTaskInDestination?.position ?? -1) + 1,
    },
  });

  console.log("Res:", res);

  revalidatePath(
    `/${session.user.activeCompanyId}/tasks/${actualBoardSection?.boardId}`,
  );

  //TODO: I need to update task embbedings here
};
