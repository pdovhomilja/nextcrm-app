import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//Update task API endpoint
export async function PUT(req: Request) {
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

  if (!section) {
    return new NextResponse("Missing section id", { status: 400 });
  }

  try {
    await prismadb.tasks.update({
      where: {
        id: id,
      },
      data: {
        updatedBy: session.user.id,
        section: section,
      },
    });
    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

//Delete task API endpoint
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
    //Find data for current task by ID
    /*     const currentTask = await Tasks.findById(taskId); */
    const currentTask = await prismadb.tasks.findUnique({
      where: {
        id,
      },
    });

    /*     
      Delete all tasks comments
      You must delete tasks comments before you delete task, because of foreign key constraint.
      TODO: This can be done by PRISMA cascade delete
      */
    await prismadb.tasksComments.deleteMany({
      where: {
        task: id,
      },
    });

    //console.log("Deleted task comments: ", deletedTasksComments);

    //console.log(currentTask, "currentTask from deleteTask API call");
    //Delete task from DB by ID

    await prismadb.tasks.delete({
      where: {
        id,
      },
    });

    if (!currentTask) {
      return NextResponse.json({ Message: "NO currentTask" }, { status: 200 });
    }
    //Find in which sections was current deleted task
    const tasks = await prismadb.tasks.findMany({
      where: {
        section: currentTask.section,
      },
      orderBy: {
        position: "asc",
      },
    });
    //console.log(tasks, "tasks from deleteTask API call");
    for (const key in tasks) {
      const position = parseInt(key);

      await prismadb.tasks.update({
        where: {
          id: tasks[key].id,
        },
        data: {
          updatedBy: session.user.id,
          position: position,
        },
      });
    }

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.log("[NEW_BOARD_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
