import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.projectId) {
    return new NextResponse("Missing project ID", { status: 400 });
  }
  const boardId = params.projectId;

  try {
    const sections = await prismadb.sections.findMany({
      where: {
        board: boardId,
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
