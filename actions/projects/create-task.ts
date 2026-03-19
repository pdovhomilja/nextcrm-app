"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";

export const createTask = async (data: {
  title: string;
  user: string;
  board: string;
  priority: string;
  content: string;
  dueDateAt?: Date;
  account?: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { title, user, board, priority, content, dueDateAt } = data;

  if (!title || !user || !board || !priority || !content) {
    return { error: "Missing one of the task data" };
  }

  try {
    const sectionId = await prismadb.sections.findFirst({
      where: { board },
      orderBy: { position: "asc" },
    });

    if (!sectionId) return { error: "No section found" };

    const tasksCount = await prismadb.tasks.count({
      where: { section: sectionId.id },
    });

    const task = await prismadb.tasks.create({
      data: {
        v: 0,
        priority,
        title,
        content,
        dueDateAt,
        section: sectionId.id,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        position: tasksCount > 0 ? tasksCount : 0,
        user,
        taskStatus: "ACTIVE",
      },
    });

    await prismadb.boards.update({
      where: { id: board },
      data: { updatedAt: new Date() },
    });

    // Send email notification if assigning to a different user
    if (user !== session.user.id) {
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
            where: { id: board },
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
        console.log("[CREATE_TASK_EMAIL]", emailError);
      }
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[CREATE_TASK]", error);
    return { error: "Failed to create task" };
  }
};
