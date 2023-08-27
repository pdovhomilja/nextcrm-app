import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//Create new task from CRM in project route

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { title, user, board, priority, content, account, dueDateAt } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!title || !user || !priority || !content || !account) {
    return new NextResponse("Missing one of the task data ", { status: 400 });
  }

  try {
    await prismadb.tasks.create({
      data: {
        v: 0,
        priority: priority,
        title: title,
        content,
        account,
        dueDateAt,
        createdBy: user,
        updatedBy: user,
        position: 0,
        user: user,
        taskStatus: "ACTIVE",
      },
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
