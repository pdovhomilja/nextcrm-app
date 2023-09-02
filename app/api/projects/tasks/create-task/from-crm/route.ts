import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import { LangChainStream } from "ai";

const resend = new Resend(process.env.RESEND_API_KEY);

//Create new task from CRM in project route
export async function POST(req: Request) {
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
    const task = await prismadb.tasks.create({
      data: {
        v: 0,
        priority: priority,
        title: title,
        content,
        account,
        dueDateAt,
        createdBy: user,
        updatedBy: user,
        position: 0,
        user: user,
        taskStatus: "ACTIVE",
      },
    });

    //Notification to user who is not a task creator
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

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
