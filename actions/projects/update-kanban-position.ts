"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteBoard,
  assertCanWriteTask,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { assertIdString } from "@/lib/authz/ids";

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
  // (board write OR assignee bypass for status-only changes). The bypass
  // covers moves within the task's board only: moving a task to another
  // board needs write access on both boards.
  try {
    const moves = [
      ...resourceList.map((t) => ({ id: t.id, section: resourceSectionId })),
      ...destinationList.map((t) => ({ id: t.id, section: destinationSectionId })),
    ];
    const boardOf = new Map<string, string>();
    for (const sectionId of [resourceSectionId, destinationSectionId]) {
      assertIdString(sectionId);
      const sec = await prismadb.sections.findUnique({ where: { id: sectionId }, select: { board: true } });
      if (!sec) throw new AuthorizationError();
      boardOf.set(sectionId, sec.board);
    }
    for (const move of moves) {
      await assertCanWriteTask(authzUser, move.id);
      const task = await prismadb.tasks.findUnique({
        where: { id: move.id },
        select: { assigned_section: { select: { board: true } } },
      });
      const from = task?.assigned_section?.board;
      const to = boardOf.get(move.section)!;
      if (from !== to) {
        if (!from) throw new AuthorizationError();
        await assertCanWriteBoard(authzUser, from);
        await assertCanWriteBoard(authzUser, to);
      }
    }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
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
