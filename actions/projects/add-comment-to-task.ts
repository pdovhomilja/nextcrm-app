"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import { revalidatePath } from "next/cache";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";

export const addCommentToTask = async (data: {
  taskId: string;
  comment: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { taskId, comment } = data;
  if (!taskId) return { error: "Missing task ID" };
  if (!comment) return { error: "Missing comment" };

  try {
    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "Task not found" };
    if (!task.section) return { error: "Task section not found" };

    const section = await prismadb.sections.findUnique({
      where: { id: task.section },
    });

    if (section) {
      // Task from Projects module - add user as board watcher
      await prismadb.boards.update({
        where: { id: section.board },
        data: {
          watchers: junctionTableHelpers.addWatcher(session.user.id),
        },
      });

      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment,
          task: taskId,
          user: session.user.id,
        },
      });

      // Send email to all board watchers except the commenter
      try {
        let resend;
        try {
          resend = await resendHelper();
        } catch {
          resend = null;
        }

        if (resend) {
          const boardWatchers = await prismadb.boardWatchers.findMany({
            where: {
              board_id: section.board,
              user_id: { not: session.user.id },
            },
            include: { user: true },
          });

          const emailRecipients = boardWatchers.map(
            (w: (typeof boardWatchers)[number]) => w.user
          );

          // Also add task creator if different from commenter
          if (task.createdBy) {
            const taskCreator = await prismadb.users.findUnique({
              where: { id: task.createdBy },
            });
            if (taskCreator && taskCreator.id !== session.user.id) {
              emailRecipients.push(taskCreator);
            }
          }

          for (const user of emailRecipients) {
            await resend.emails.send({
              from:
                process.env.NEXT_PUBLIC_APP_NAME +
                " <" +
                process.env.EMAIL_FROM +
                ">",
              to: user?.email!,
              subject:
                session.user.userLanguage === "en"
                  ? `New comment on task ${task.title}.`
                  : `Nový komentář k úkolu ${task.title}.`,
              text: "",
              react: NewTaskCommentEmail({
                commentFromUser: session.user.name!,
                username: user?.name!,
                userLanguage: user?.userLanguage!,
                taskId: task.id,
                comment,
              }),
            });
          }
        }
      } catch (emailError) {
        console.log("[ADD_COMMENT_EMAIL]", emailError);
      }

      revalidatePath("/[locale]/(routes)/projects", "page");
      return { data: newComment };
    } else {
      // Task from CRM module (no section board)
      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment,
          task: taskId,
          user: session.user.id,
        },
      });

      revalidatePath("/[locale]/(routes)/projects", "page");
      return { data: newComment };
    }
  } catch (error) {
    console.log("[ADD_COMMENT_TO_TASK]", error);
    return { error: "Failed to add comment" };
  }
};
