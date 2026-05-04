"use server";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanReadBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const watchProject = async (projectId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  if (!projectId) return { error: "Missing project ID" };

  try {
    await assertCanReadBoard(user, projectId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: {
        watchers: junctionTableHelpers.addWatcher(user.id),
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[WATCH_PROJECT]", error);
    return { error: "Failed to watch project" };
  }
};

export const unwatchProject = async (projectId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  if (!projectId) return { error: "Missing project ID" };

  try {
    await assertCanReadBoard(user, projectId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: {
        watchers: junctionTableHelpers.removeBoardWatcher(
          projectId,
          user.id
        ),
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[UNWATCH_PROJECT]", error);
    return { error: "Failed to unwatch project" };
  }
};
