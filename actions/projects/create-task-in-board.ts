"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";

export const createTaskInBoard = async (data: {
  boardId: string;
  section: string;
  title?: string;
  priority?: string;
  content?: string;
  user?: string;
  dueDateAt?: Date;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { boardId, section, title, priority, content, user, dueDateAt } = data;

  if (!section) return { error: "Missing section ID" };

  // Quick-add path: no title/user/priority/content - create a blank task
  if (!title || !user || !priority || !content) {
    try {
      const tasksCount = await prismadb.tasks.count({
        where: { section },
      });

      await prismadb.tasks.create({
        data: {
          v: 0,
          priority: "normal",
          title: "New task",
          content: "",
          section,
          createdBy: session.user.id,
          updatedBy: session.user.id,
          position: tasksCount > 0 ? tasksCount : 0,
          user: session.user.id,
          taskStatus: "ACTIVE",
        },
      });

      await prismadb.boards.update({
        where: { id: boardId },
        data: { updatedAt: new Date() },
      });

      revalidatePath("/[locale]/(routes)/projects", "page");
      return { success: true };
    } catch (error) {
      console.log("[CREATE_TASK_IN_BOARD_QUICK]", error);
      return { error: "Failed to create task" };
    }
  }

  // Full-detail path
  try {
    const tasksCount = await prismadb.tasks.count({
      where: { section },
    });

    const task = await prismadb.tasks.create({
      data: {
        v: 0,
        priority,
        title,
        content,
        dueDateAt,
        section,
        createdBy: user,
        updatedBy: user,
        position: tasksCount > 0 ? tasksCount : 0,
        user,
        taskStatus: "ACTIVE",
      },
    });

    await prismadb.boards.update({
      where: { id: boardId },
      data: { updatedAt: new Date() },
    });

    // Send email notification if assigning to a different user
    if (user !== session.user.id) {
      try {
        let resend;
        try {
          resend = await resendHelper();
        } catch {
          // Email not configured, skip silently
          resend = null;
        }

        if (resend) {
          const notifyRecipient = await prismadb.users.findUnique({
            where: { id: user },
          });

          const boardData = await prismadb.boards.findUnique({
            where: { id: boardId },
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
                  ? `New task - ${title}.`
                  : `Nový úkol - ${title}.`,
              text: "",
              react: NewTaskFromProject({
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
        console.log("[CREATE_TASK_IN_BOARD_EMAIL]", emailError);
      }
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[CREATE_TASK_IN_BOARD]", error);
    return { error: "Failed to create task" };
  }
};
