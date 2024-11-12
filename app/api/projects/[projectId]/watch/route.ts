import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

  console.log(boardId, "boardId");
  console.log(session.user.id, "session.user.id");

  try {
    await prismadb.boards.update({
      where: {
        id: boardId,
      },
      data: {
        watchers_users: {
          connect: {
            id: session.user.id,
          },
        },
      },
    });
    return NextResponse.json({ message: "Board watched" }, { status: 200 });
  } catch (error) {
    console.log(error);
  }
}
