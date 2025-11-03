import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handleDELETE(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!params.projectId) {
    return new NextResponse("Missing project ID", { status: 400 });
  }
  const boardId = params.projectId;

  try {
    // Verify the board belongs to the user's organization
    const existingBoard = await prismadb.boards.findFirst({
      where: {
        id: boardId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingBoard) {
      return new NextResponse("Board not found or unauthorized", { status: 404 });
    }

    const sections = await prismadb.sections.findMany({
      where: {
        board: boardId,
        organizationId: session.user.organizationId,
      },
    });

    for (const section of sections) {
      await prismadb.tasks.deleteMany({
        where: {
          section: section.id,
        },
      });
    }
    await prismadb.sections.deleteMany({
      where: {
        board: boardId,
        organizationId: session.user.organizationId,
      },
    });

    await prismadb.boards.delete({
      where: {
        id: boardId,
      },
    });

    return NextResponse.json({ message: "Board deleted" }, { status: 200 });
  } catch (error) {
    console.log("[PROJECT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const DELETE = withRateLimit(handleDELETE);
