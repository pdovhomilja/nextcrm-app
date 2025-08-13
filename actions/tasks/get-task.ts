import { auth } from "@/auth";
import { getUserByEmail } from "../user";
import db from "@/lib/db";

export const getTask = async (taskId: string) => {
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
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, image: true },
      },
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      boardSection: {
        select: {
          id: true,
          name: true,
          position: true,
          board: { select: { id: true, name: true, description: true } },
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          summary: true,
          keyInsights: true,
          confidence: true,
          uploadedBy: true,
          processedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
};
