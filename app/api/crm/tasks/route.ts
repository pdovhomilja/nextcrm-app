import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//Delete task API endpoint - for CRM tasks
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  console.log(body, "body");
  const { id, section } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!id) {
    return new NextResponse("Missing board id", { status: 400 });
  }

  try {
    const currentTask = await prismadb.crm_Accounts_Tasks.findUnique({
      where: {
        id,
      },
    });

    await prismadb.tasksComments.deleteMany({
      where: {
        task: id,
      },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: {
        id,
      },
    });

    if (!currentTask) {
      return NextResponse.json({ Message: "NO currentTask" }, { status: 200 });
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
