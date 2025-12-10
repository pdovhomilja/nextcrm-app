import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export async function POST(req: Request, props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!params.projectId) {
    return new NextResponse("Missing project ID", { status: 400 });
  }

  const boardId = params.projectId;

  try {
    // Remove watcher using BoardWatchers junction table with composite key
    await prismadb.boards.update({
      where: {
        id: boardId,
      },
      data: {
        watchers: junctionTableHelpers.removeBoardWatcher(boardId, session.user.id),
      },
    });
    return NextResponse.json({ message: "Board unwatched" }, { status: 200 });
  } catch (error) {
    console.log(error);
    return new NextResponse("Failed to unwatch board", { status: 500 });
  }
}
