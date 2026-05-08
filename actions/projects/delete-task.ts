"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteTask = async (data: { id: string; section?: string }) => {
  let authzUser;
  try {
    authzUser = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { id } = data;
  if (!id) return { error: "Missing task ID" };

  const existing = await prismadb.tasks.findUnique({
    where: { id },
    select: {
      id: true,
      section: true,
      assigned_section: { select: { board_relation: { select: { id: true } } } },
    },
  });
  const parentBoardId = existing?.assigned_section?.board_relation?.id;
  if (!parentBoardId) return { error: "Not found" };

  try {
    await assertCanWriteBoard(authzUser, parentBoardId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    const currentTask = await prismadb.tasks.findUnique({
      where: { id },
    });

    // Delete all task comments first (foreign key constraint)
    await prismadb.tasksComments.deleteMany({
      where: { task: id },
    });

    await prismadb.tasks.delete({
      where: { id },
    });

    if (currentTask) {
      // Reorder remaining tasks in the section
      const tasks = await prismadb.tasks.findMany({
        where: { section: currentTask.section },
        orderBy: { position: "asc" },
      });

      for (const key in tasks) {
        const position = parseInt(key);
        await prismadb.tasks.update({
          where: { id: tasks[key].id },
          data: {
            updatedBy: session.user.id,
            position,
          },
        });
      }
    }

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_TASK]", error);
    return { error: "Failed to delete task" };
  }
};
