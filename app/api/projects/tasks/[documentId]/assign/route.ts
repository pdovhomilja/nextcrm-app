import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ documentId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body) return NextResponse.json({ error: "No body" }, { status: 400 });

  const { taskId } = body;
  //console.log(taskId, "taskId");
  const { documentId } = params;
  //console.log(documentId, "documentId");

  try {
    const task = await prismadb.tasks.findUnique({
      where: { id: taskId },
    });

    if (task) {
      //Connect the document to the task
      await prismadb.tasks.update({
        where: {
          id: taskId,
        },
        data: {
          updatedBy: session.user.id,
          documents: {
            connect: {
              id: documentId,
            },
          },
        },
      });

      //Connect the task to the document
      await prismadb.documents.update({
        where: {
          id: documentId,
        },
        data: {
          tasks: {
            //Disconnect the task from the document
            connect: {
              id: taskId,
            },
          },
        },
      });

      return NextResponse.json(
        { message: "Task assigned to document" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}
