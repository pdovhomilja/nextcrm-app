import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.projectId) {
    return new NextResponse("Missing project ID", { status: 400 });
  }

  try {
    await prismadb.boards.delete({
      where: {
        id: params.projectId,
      },
    });

    return NextResponse.json({ message: "Board deleted" }, { status: 200 });
  } catch (error) {
    console.log("[Account_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
