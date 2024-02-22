import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

  try {
    const boardsCount = await prismadb.boards.count();

    const newBoard = await prismadb.boards.create({
      data: {
        v: 0,
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

  try {
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
