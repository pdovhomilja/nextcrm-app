import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";

export async function POST(
  req: Request,
  props: { params: Promise<{ taskId: string }> }
) {
  const params = await props.params;
  /*
  Resend.com function init - this is a helper function that will be used to send emails
  */
  const resend = await resendHelper();
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { comment } = body;
  const { taskId } = params;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!taskId) {
    return new NextResponse("Missing taskId", { status: 400 });
  }

  if (!comment) {
    return new NextResponse("Missing comment", { status: 400 });
  }

  try {
    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    //console.log(task, "task");

    if (!task.section) {
      return new NextResponse("Task section not found", { status: 404 });
    }

    //TODO: this can be done in a single query if there will be boardID in task
    const section = await prismadb.sections.findUnique({
      where: { id: task.section },
    });

    //console.log(section, "section");

    if (section) {
      //If there is a section, it is task from Projects if there is no section it is task from CRM
      //ADD USER TO WATCHERS - on Board
      await prismadb.boards.update({
        where: {
          id: section.board,
        },
        data: {
          watchers_users: {
            connect: {
              id: session.user.id,
            },
          },
        },
      });

      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment: comment,
          task: taskId,
          user: session.user.id,
        },
      });

      const emailRecipients = await prismadb.users.findMany({
        where: {
          //Send to all users watching the board except the user who created the comment
          id: {
            not: session.user.id,
          },
          watching_boardsIDs: {
            has: section.board,
          },
        },
      });

      // Add the task creator to the email recipients
      if (task.createdBy) {
        const taskCreator = await prismadb.users.findUnique({
          where: { id: task.createdBy },
        });
        if (taskCreator) {
          emailRecipients.push(taskCreator); // Add the task creator to the recipients
        }
      }

      //Create notifications for every user watching the board except the user who created the comment
      for (const userID of emailRecipients) {
        const user = await prismadb.users.findUnique({
          where: {
            id: userID.id,
          },
        });

        //console.log("Comment send to user: ", user?.email);

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: user?.email!,
          subject:
            session.user.userLanguage === "en"
              ? `New comment  on task ${task.title}.`
              : `Nový komentář k úkolu ${task.title}.`,
          text: "", // Add this line to fix the types issue
          react: NewTaskCommentEmail({
            commentFromUser: session.user.name!,
            username: user?.name!,
            userLanguage: user?.userLanguage!,
            taskId: task.id,
            comment: comment,
          }),
        });
      }
      return NextResponse.json(newComment, { status: 200 });
    } else {
      //
      const newComment = await prismadb.tasksComments.create({
        data: {
          v: 0,
          comment: comment,
          task: taskId,
          user: session.user.id,
        },
      });
      return NextResponse.json(newComment, { status: 200 });
    }

    /*      */
  } catch (error) {
    console.log("[COMMENTS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
