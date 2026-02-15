"use server";

import { triggerTaskEmbeddingUpdate } from "@/lib/ai/embedding-triggers";
import db from "@/lib/db";
import {
  requireAuth,
  verifyTaskAccess,
} from "@/lib/security/company-access-validator";

export type EditTaskInput = {
  title?: string;
  description?: string | null;
  status?: "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: Date | string | null;
  assignedToId?: string;
};

export const editTask = async (taskId: string, data: EditTaskInput) => {
  const { userId, activeCompanyId } = await requireAuth();
  await verifyTaskAccess(taskId, userId, activeCompanyId);

  // Normalize dueDate if provided as string
  const normalized: EditTaskInput = {
    ...data,
    dueDate:
      typeof data.dueDate === "string" ? new Date(data.dueDate) : data.dueDate,
  };

  const updateData: Record<string, unknown> = {};
  if (normalized.title !== undefined) updateData.title = normalized.title;
  if (normalized.description !== undefined) updateData.description = normalized.description;
  if (normalized.status !== undefined) updateData.status = normalized.status;
  if (normalized.priority !== undefined) updateData.priority = normalized.priority;
  if (normalized.dueDate !== undefined) updateData.dueDate = normalized.dueDate;
  if (normalized.assignedToId !== undefined) updateData.assignedToId = normalized.assignedToId;

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: updateData as Parameters<typeof db.task.update>[0]["data"],
  });

  // Update task embeddings
  triggerTaskEmbeddingUpdate(updatedTask.id).catch((error) => {
    console.error("Failed to queue embedding update:", error);
  });

  return { message: "Task updated successfully" };
};
