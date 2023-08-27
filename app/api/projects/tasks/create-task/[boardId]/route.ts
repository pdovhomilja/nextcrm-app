import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { boardId: string } }
) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
  const { boardId } = params;
  const { title, priority, content, section } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  let user = session.user.id;

  /*  if (!boardId) {
    return new NextResponse("Missing board id", { status: 400 });
  } */

  if (!section) {
    return new NextResponse("Missing section id", { status: 400 });
  }

  //console.log(section, "section");

  if (!title || !user || !priority || !content) {
    try {
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      await prismadb.tasks.create({
        data: {
          v: 0,
          priority: "normal",
          title: "New task",
          content: "",
          section: section,
          createdBy: user,
          updatedBy: user,
          position: tasksCount > 0 ? tasksCount : 0,
          user: user,
          taskStatus: "ACTIVE",
        },
      });

      return NextResponse.json({ status: 200 });
    } catch (error) {
      console.log("[NEW_TASK_IN_PROJECT_POST]", error);
      return new NextResponse("Initial error", { status: 500 });
    }
  } else {
    try {
      const tasksCount = await prismadb.tasks.count({
        where: {
          section: section,
        },
      });

      await prismadb.tasks.create({
        data: {
          v: 0,
          priority: priority,
          title: title,
          content: content,
          section: section,
          createdBy: user,
          updatedBy: user,
          position: tasksCount > 0 ? tasksCount : 0,
          user: user,
          taskStatus: "ACTIVE",
        },
      });

      return NextResponse.json({ status: 200 });
    } catch (error) {
      console.log("[NEW_TASK_IN_PROJECT_POST]", error);
      return new NextResponse("Initial error", { status: 500 });
    }
  }
}
