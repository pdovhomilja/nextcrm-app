import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import NewTaskFromCRMToWatchersEmail from "@/emails/NewTaskFromCRMToWatchers";
import resendHelper from "@/lib/resend";

//Create new task from CRM in project route
export async function POST(req: Request) {
  /*
  Resend.com function init - this is a helper function that will be used to send emails
  */
  const resend = await resendHelper();

  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { title, user, priority, content, account, dueDateAt } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!title || !user || !priority || !content || !account) {
    return new NextResponse("Missing one of the task data ", { status: 400 });
  }

  try {
    const task = await prismadb.crm_Accounts_Tasks.create({
      data: {
        v: 0,
        priority: priority,
        title: title,
        content,
        account,
        dueDateAt,
        createdBy: user,
        updatedBy: user,
        user: user,
        taskStatus: "ACTIVE",
      },
    });

    //Notification to user who is not a task creator or Account watcher
    if (user !== session.user.id) {
      try {
        const notifyRecipient = await prismadb.users.findUnique({
          where: { id: user },
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
          react: NewTaskFromCRMEmail({
            taskFromUser: session.user.name!,
            username: notifyRecipient?.name!,
            userLanguage: notifyRecipient?.userLanguage!,
            taskData: task,
          }),
        });
        //console.log("Email sent to user: ", notifyRecipient?.email!);
      } catch (error) {
        console.log(error);
      }
    }

    //Notification to user who are account watchers
    try {
      const emailRecipients = await prismadb.users.findMany({
        where: {
          //Send to all users watching the board except the user who created the comment
          id: {
            not: session.user.id,
          },
          watching_accountsIDs: {
            has: account,
          },
        },
      });
      //Create notifications for every user watching the specific account except the user who created the task
      for (const userID of emailRecipients) {
        const user = await prismadb.users.findUnique({
          where: {
            id: userID.id,
          },
        });
        console.log("Send email to user: ", user?.email!);
        await resend.emails.send({
          from:
            process.env.NEXT_PUBLIC_APP_NAME +
            " <" +
            process.env.EMAIL_FROM +
            ">",
          to: user?.email!,
          subject:
            session.user.userLanguage === "en"
              ? `New task -  ${title}.`
              : `Nový úkol - ${title}.`,
          text: "", // Add this line to fix the types issue
          react: NewTaskFromCRMToWatchersEmail({
            taskFromUser: session.user.name!,
            username: user?.name!,
            userLanguage: user?.userLanguage!,
            taskData: task,
          }),
        });
      }
    } catch (error) {
      console.log(error);
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
