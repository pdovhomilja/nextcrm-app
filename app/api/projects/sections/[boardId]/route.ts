import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, props: { params: Promise<{ boardId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { boardId } = params;
  const { title } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user?.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!title) {
    return new NextResponse("Missing one of the task data ", { status: 400 });
  }

  try {
    // Verify board belongs to the user's organization
    const board = await prismadb.boards.findFirst({
      where: {
        id: boardId,
        organizationId: session.user.organizationId,
      },
    });

    if (!board) {
      return new NextResponse("Board not found or unauthorized", { status: 404 });
    }

    console.log(boardId, "boardId");
    const sectionPosition = await prismadb.sections.count({
      where: {
        board: boardId,
        organizationId: session.user.organizationId,
      },
    });

    console.log(sectionPosition, "sectionPosition");
    const newSection = await prismadb.sections.create({
      data: {
        v: 0,
        organizationId: session.user.organizationId,
        board: boardId,
        title: title,
        position: sectionPosition > 0 ? sectionPosition : 0,
      },
    });

    return NextResponse.json({ newsecton: newSection }, { status: 200 });
  } catch (error) {
    console.log("[NEW_SECTION_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
