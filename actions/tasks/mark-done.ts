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

  const lastBoardSection = await db.board.findMany({
    where: {
      id: actualBoardSection?.boardId,
    },
    include: {
      boardSections: {
        orderBy: {
          position: "desc",
        },
        take: 1,
      },
    },
  });

  //console.log("Last board section:", lastBoardSection);

  //console.log("Actual board section:", actualBoardSection);

  await db.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      boardSectionId: lastBoardSection[0].boardSections[0].id,
    },
  });

  revalidatePath(`/${session.user.cid}/tasks/${actualBoardSection?.boardId}`);

  //TODO: I need to update task embbedings here
};
