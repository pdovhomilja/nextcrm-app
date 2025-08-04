"use server";

import db from "@/lib/db";

export async function deleteTask(taskId: string) {
  await db.task.delete({
    where: {
      id: taskId,
    },
  });
}
