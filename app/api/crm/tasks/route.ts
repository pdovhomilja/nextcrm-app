import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimited } from "@/middleware/with-rate-limit";

//Delete task API endpoint - for CRM tasks
async function handleDELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  console.log(body, "body");
  const { id, section } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!id) {
    return new NextResponse("Missing board id", { status: 400 });
  }

  if (!session.user?.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  const organizationId = session.user.organizationId;

  try {
    // Verify the task belongs to the user's organization
    const currentTask = await prismadb.crm_Accounts_Tasks.findFirst({
      where: {
        id,
        organizationId: organizationId,
      },
    });

    if (!currentTask) {
      return new NextResponse("Task not found or unauthorized", { status: 404 });
    }

    await prismadb.tasksComments.deleteMany({
      where: {
        task: id,
      },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: {
        id,
      },
    });

    if (!currentTask) {
      return NextResponse.json({ Message: "NO currentTask" }, { status: 200 });
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const DELETE = rateLimited(handleDELETE);
