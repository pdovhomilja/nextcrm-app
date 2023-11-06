import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import NewTaskFromProject from "@/emails/NewTaskFromProject";
import resendHelper from "@/lib/resend";

//Create new task in project route
/*
TODO: there is second route for creating task in board, but it is the same as this one. Consider merging them (/api/projects/tasks/create-task/[boardId]). 
*/
export async function PUT(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  /*
  Resend.com function init - this is a helper function that will be used to send emails
  */
  const resend = await resendHelper();
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { title, user, board, priority, content, notionUrl, dueDateAt } = body;

  const taskId = params.taskId;

  if (!taskId) {
    return new NextResponse("Missing task id", { status: 400 });
  }

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!title || !user || !priority || !content) {
    return new NextResponse("Missing one of the task data ", { status: 400 });
  }

  try {
    //Get first section from board where position is smallest
    const sectionId = await prismadb.sections.findFirst({
      where: {
        board: board,
      },
      orderBy: {
        position: "asc",
      },
    });

    if (!sectionId) {
      return new NextResponse("No section found", { status: 400 });
    }

    const tasksCount = await prismadb.tasks.count({
      where: {
        section: sectionId.id,
      },
    });

    let contentUpdated = content;

    if (notionUrl) {
      contentUpdated = content + "\n\n" + notionUrl;
    }

    const task = await prismadb.tasks.update({
      where: {
        id: taskId,
      },
      data: {
        priority: priority,
        title: title,
        content: contentUpdated,
        updatedBy: user,
        dueDateAt: dueDateAt,
        user: user,
      },
    });

    /*  //Notification to user who is not a task creator
    if (user !== session.user.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: user },
        });

        const boardData = await prismadb.boards.findUnique({
          where: { id: board },
        });

        //console.log(notifyRecipient, "notifyRecipient");

        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: notifyRecipient?.email!,
          subject:
            session.user.userLanguage === "en"
              ? `New task -  ${title}.`
              : `Nový úkol - ${title}.`,
          text: "", // Add this line to fix the types issue
          react: NewTaskFromProject({
            taskFromUser: session.user.name!,
            username: notifyRecipient?.name!,
            userLanguage: notifyRecipient?.userLanguage!,
            taskData: task,
            boardData: boardData,
          }),
        });
        console.log("Email sent to user: ", notifyRecipient?.email!);
      } catch (error) {
        console.log(error);
      }
    } */

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
