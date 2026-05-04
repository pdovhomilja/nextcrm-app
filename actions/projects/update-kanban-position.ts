"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTask,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateKanbanPosition = async (data: {
  resourceList: { id: string }[];
  destinationList: { id: string }[];
  resourceSectionId: string;
  destinationSectionId: string;
}) => {
  let authzUser;
  try {
    authzUser = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const {
    resourceList,
    destinationList,
    resourceSectionId,
    destinationSectionId,
  } = data;

  // Soft scope: each affected task must be writable by current user
  // (board write OR assignee bypass for status-only changes).
  const allTaskIds = [
    ...resourceList.map((t) => t.id),
    ...destinationList.map((t) => t.id),
  ];
  for (const id of allTaskIds) {
    try {
      await assertCanWriteTask(authzUser, id);
    } catch (e) {
      if (e instanceof AuthorizationError) return { error: "Forbidden" };
      throw e;
    }
  }

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
