"use server";

import { triggerTaskEmbeddingUpdate } from "@/lib/ai/embedding-triggers";
import db from "@/lib/db";

export type EditTaskInput = {
  title?: string;
  description?: string | null;
  status?: "NEW" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: Date | string | null;
};

export const editTask = async (taskId: string, data: EditTaskInput) => {
  // Normalize dueDate if provided as string
  const normalized: EditTaskInput = {
    ...data,
    dueDate:
      typeof data.dueDate === "string" ? new Date(data.dueDate) : data.dueDate,
  };

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: normalized as any,
  });

  // I need to update task embbedings here
  triggerTaskEmbeddingUpdate(updatedTask.id).catch((error) => {
    console.error("Failed to queue embedding update:", error);
  });

  return { message: "Task updated successfully" };
};
