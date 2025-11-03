import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canCreateProject } from "@/lib/quota-enforcement";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { title, description, visibility } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!title) {
    return new NextResponse("Missing project name", { status: 400 });
  }

  if (!description) {
    return new NextResponse("Missing project description", { status: 400 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    // Check quota before creating project
    const quotaCheck = await canCreateProject(session.user.organizationId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || "Project limit reached",
          requiresUpgrade: true,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 }
      );
    }

    const boardsCount = await prismadb.boards.count({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    const newBoard = await prismadb.boards.create({
      data: {
        v: 0,
        organizationId: session.user.organizationId,
        user: session.user.id,
        title: title,
        description: description,
        position: boardsCount > 0 ? boardsCount : 0,
        visibility: visibility,
        sharedWith: [session.user.id],
        createdBy: session.user.id,
      },
    });

    await prismadb.sections.create({
      data: {
        v: 0,
        organizationId: session.user.organizationId,
        board: newBoard.id,
        title: "Backlog",
        position: 0,
      },
    });

    return NextResponse.json({ newBoard }, { status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { id, title, description, visibility } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!title) {
    return new NextResponse("Missing project name", { status: 400 });
  }

  if (!description) {
    return new NextResponse("Missing project description", { status: 400 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    // Verify the board belongs to the user's organization
    const existingBoard = await prismadb.boards.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingBoard) {
      return new NextResponse("Board not found or unauthorized", { status: 404 });
    }

    await prismadb.boards.update({
      where: {
        id,
      },
      data: {
        title: title,
        description: description,
        visibility: visibility,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Board updated successfullsy" },
      { status: 200 }
    );
  } catch (error) {
    console.log("[UPDATE_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
