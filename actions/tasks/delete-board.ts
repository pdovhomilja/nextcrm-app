"use server";

import db from "@/lib/db";
import {
  triggerBoardEmbeddingDeletion,
  triggerTaskEmbeddingDeletion,
} from "@/lib/ai/embedding-triggers";
import { deleteTask } from "./delete-task";
import { deleteBoardSection } from "./delete-board-section";

export async function deleteBoard(boardId: string) {
  const sections = await db.boardSection.findMany({
    where: {
      boardId: boardId,
    },
  });

  for (const section of sections) {
    const tasks = await db.task.findMany({
      where: {
        boardSectionId: section.id,
      },
    });
    for (const task of tasks) {
      await deleteTask(task.id);
    }
    await deleteBoardSection(section.id, boardId);
  }

  // Trigger embedding deletion (non-blocking)
  await triggerBoardEmbeddingDeletion(boardId).catch((error) => {
    console.error("Failed to delete board embedding:", error);
  });
  await db.board.delete({
    where: {
      id: boardId,
    },
  });

  return { message: "Board deleted successfully" };
}
