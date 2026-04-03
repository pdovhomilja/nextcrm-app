"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import UpdatedTaskFromProject from "@/emails/UpdatedTaskFromProject";
import resendHelper from "@/lib/resend";

export const updateTask = async (data: {
  taskId: string;
  title: string;
  user: string;
  board?: string;
  boardId?: string;
  priority: string;
  content: string;
  dueDateAt?: Date;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { taskId, title, user, boardId, priority, content, dueDateAt } = data;
  const resolvedBoardId = boardId || data.board;

  if (!taskId) return { error: "Missing task ID" };
  if (!title || !user || !priority || !content) {
    return { error: "Missing one of the task data" };
  }

  try {
    const task = await prismadb.tasks.update({
      where: { id: taskId },
      data: {
        priority,
        title,
        content,
        updatedBy: user,
        dueDateAt,
        user,
      },
    });

    if (resolvedBoardId) {
      await prismadb.boards.update({
        where: { id: resolvedBoardId },
        data: { updatedAt: new Date() },
      });
    }

    // Send email notification if assigning to a different user
    if (user !== session.user.id && resolvedBoardId) {
      try {
        let resend;
        try {
          resend = await resendHelper();
        } catch {
          resend = null;
        }

        if (resend) {
          const notifyRecipient = await prismadb.users.findUnique({
            where: { id: user },
          });

          const boardData = await prismadb.boards.findUnique({
            where: { id: resolvedBoardId },
          });

          if (notifyRecipient?.email) {
            await resend.emails.send({
              from:
                process.env.NEXT_PUBLIC_APP_NAME +
                " <" +
                process.env.EMAIL_FROM +
                ">",
              to: notifyRecipient.email,
              subject:
                session.user.userLanguage === "en"
                  ? `Task - ${title} - was updated.`
                  : `Úkol - ${title} - byl aktualizován.`,
              text: "",
              react: UpdatedTaskFromProject({
                taskFromUser: session.user.name!,
                username: notifyRecipient.name!,
                userLanguage: notifyRecipient.userLanguage!,
                taskData: task,
                boardData,
              }),
            });
          }
        }
      } catch (emailError) {
        console.log("[UPDATE_TASK_EMAIL]", emailError);
      }
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[UPDATE_TASK]", error);
    return { error: "Failed to update task" };
  }
};
