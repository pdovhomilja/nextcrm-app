import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { id } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user?.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!id) {
    return new NextResponse("Missing section ID ", { status: 400 });
  }

  console.log(id, "id");

  try {
    // Verify section belongs to the user's organization
    const section = await prismadb.sections.findFirst({
      where: {
        id: id,
        organizationId: session.user.organizationId,
      },
    });

    if (!section) {
      return new NextResponse("Section not found or unauthorized", { status: 404 });
    }

    const tasks = await prismadb.tasks.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    for (const task of tasks) {
      if (task.section === id) {
        await prismadb.tasks.delete({
          where: {
            id: task.id,
          },
        });
      }
    }

    await prismadb.sections.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json("deletedSection");
  } catch (error) {
    console.log("[PROJECT_SECTION_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
