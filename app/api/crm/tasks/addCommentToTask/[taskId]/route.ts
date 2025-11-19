import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import NewTaskCommentEmail from "@/emails/NewTaskComment";
import resendHelper from "@/lib/resend";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handlePOST(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
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

  if (!session.user?.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    // Verify the task belongs to the user's organization
    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id: taskId,
        organizationId: session.user.organizationId,
      },
    });

    if (!task) {
      return new NextResponse("Task not found or unauthorized", { status: 404 });
    }

    const newComment = await prismadb.tasksComments.create({
      data: {
        v: 0,
        comment: comment,
        task: taskId,
        user: session.user.id,
      },
    });

    //TODO: add email notification

    return NextResponse.json(newComment, { status: 200 });

    /*      */
  } catch (error) {
    console.log("[COMMENTS_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const POST = withRateLimit(handlePOST);
