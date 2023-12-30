import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const {
    resourceList,
    destinationList,
    resourceSectionId,
    destinationSectionId,
  } = body;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    /*   const resourceList = body.resourceList;
    const destinationList = body.destinationList;
    const resourceSectionId = body.resourceSectionId;
    const destinationSectionId = body.destinationSectionId; */
    const resourceListReverse = resourceList.reverse();
    const destinationListReverse = destinationList.reverse();

    try {
      if (resourceSectionId !== destinationSectionId) {
        for (let key: any = 0; key < resourceListReverse.length; key++) {
          const task = resourceListReverse[key];
          const position = parseInt(key);

          await prismadb.tasks.update({
            where: {
              id: task.id,
            },
            data: {
              section: resourceSectionId,
              position: position,
              updatedBy: session.user.id,
            },
          });
        }
      }

      for (let key: any = 0; key < destinationListReverse.length; key++) {
        const task = destinationListReverse[key];
        const position = parseInt(key);

        await prismadb.tasks.update({
          where: {
            id: task.id,
          },
          data: {
            section: destinationSectionId,
            position: position,
            updatedBy: session.user.id,
          },
        });
      }
      console.log("Task positions updated successfully");
      return NextResponse.json(
        {
          message: "Task positions updated successfully",
        },
        {
          status: 200,
        }
      );
    } catch (err) {
      console.log(err);
      return NextResponse.json(
        {
          message: "Error updating task positions",
        },
        {
          status: 500,
        }
      );
    }
  } catch (error) {
    console.log("[UPDATE_TASK_POSITION_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
