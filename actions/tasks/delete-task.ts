"use server";

import db from "@/lib/db";
import { triggerTaskEmbeddingDeletion } from "@/lib/ai/embedding-triggers";

export async function deleteTask(taskId: string) {
  // Trigger embedding deletion (non-blocking)
  await triggerTaskEmbeddingDeletion(taskId).catch((error) => {
    console.error("Failed to delete task embedding:", error);
  });

  await db.task.delete({
    where: {
      id: taskId,
    },
  });
}
