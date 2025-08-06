"use server";

import db from "@/lib/db";
import { triggerBoardEmbeddingDeletion } from "@/lib/ai/embedding-triggers";

export async function deleteBoard(boardId: string) {
  await db.board.delete({
    where: {
      id: boardId,
    },
  });

  // Trigger embedding deletion (non-blocking)
  triggerBoardEmbeddingDeletion(boardId).catch((error) => {
    console.error("Failed to delete board embedding:", error);
  });

  return { message: "Board deleted successfully" };
}
