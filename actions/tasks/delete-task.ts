"use server";

import db from "@/lib/db";
import { triggerTaskEmbeddingDeletion } from "@/lib/ai/embedding-triggers";

export async function deleteTask(taskId: string) {
  await db.task.delete({
    where: {
      id: taskId,
    },
  });

  // Trigger embedding deletion (non-blocking)
  triggerTaskEmbeddingDeletion(taskId).catch((error) => {
    console.error("Failed to delete task embedding:", error);
  });
}
