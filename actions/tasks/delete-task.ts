"use server";

import db from "@/lib/db";
import { triggerTaskEmbeddingDeletion } from "@/lib/ai/embedding-triggers";
import {
  requireAuth,
  verifyTaskAccess,
} from "@/lib/security/company-access-validator";

export async function deleteTask(taskId: string) {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyTaskAccess(taskId, userId, activeCompanyId);

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
