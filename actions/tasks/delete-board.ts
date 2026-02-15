"use server";

import db from "@/lib/db";
import {
  triggerBoardEmbeddingDeletion,
  triggerTaskEmbeddingDeletion,
} from "@/lib/ai/embedding-triggers";
import {
  requireAuth,
  verifyBoardDeleteAccess,
} from "@/lib/security/company-access-validator";

export async function deleteBoard(boardId: string) {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyBoardDeleteAccess(boardId, userId, activeCompanyId);

  const sections = await db.boardSection.findMany({
    where: { boardId },
  });

  for (const section of sections) {
    const tasks = await db.task.findMany({
      where: { boardSectionId: section.id },
    });
    for (const task of tasks) {
      await triggerTaskEmbeddingDeletion(task.id).catch((error) => {
        console.error("Failed to delete task embedding:", error);
      });
      await db.task.delete({ where: { id: task.id } });
    }
    await db.boardSection.delete({ where: { id: section.id } });
  }

  // Trigger embedding deletion (non-blocking)
  await triggerBoardEmbeddingDeletion(boardId).catch((error) => {
    console.error("Failed to delete board embedding:", error);
  });
  await db.board.delete({
    where: { id: boardId },
  });

  return { message: "Board deleted successfully" };
}
