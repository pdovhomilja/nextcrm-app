"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateKanbanPosition = async (data: {
  resourceList: { id: string }[];
  destinationList: { id: string }[];
  resourceSectionId: string;
  destinationSectionId: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const {
    resourceList,
    destinationList,
    resourceSectionId,
    destinationSectionId,
  } = data;

  try {
    const resourceListReverse = [...resourceList].reverse();
    const destinationListReverse = [...destinationList].reverse();

    if (resourceSectionId !== destinationSectionId) {
      for (let key = 0; key < resourceListReverse.length; key++) {
        const task = resourceListReverse[key];
        await prismadb.tasks.update({
          where: { id: task.id },
          data: {
            section: resourceSectionId,
            position: key,
            updatedBy: session.user.id,
          },
        });
      }
    }

    for (let key = 0; key < destinationListReverse.length; key++) {
      const task = destinationListReverse[key];
      await prismadb.tasks.update({
        where: { id: task.id },
        data: {
          section: destinationSectionId,
          position: key,
          updatedBy: session.user.id,
        },
      });
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[UPDATE_KANBAN_POSITION]", error);
    return { error: "Failed to update task positions" };
  }
};
