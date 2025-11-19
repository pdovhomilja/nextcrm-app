import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handlePOST(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const { taskId } = params;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!taskId) {
    return new NextResponse("Missing task id", { status: 400 });
  }

  try {
    await prismadb.tasks.update({
      where: {
        id: taskId,
      },
      data: {
        taskStatus: "COMPLETE",
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_TASK_IN_PROJECT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const POST = withRateLimit(handlePOST);
