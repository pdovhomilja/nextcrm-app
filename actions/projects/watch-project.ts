"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import { revalidatePath } from "next/cache";

export const watchProject = async (projectId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!projectId) return { error: "Missing project ID" };

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: {
        watchers: junctionTableHelpers.addWatcher(session.user.id),
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
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!projectId) return { error: "Missing project ID" };

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: {
        watchers: junctionTableHelpers.removeBoardWatcher(
          projectId,
          session.user.id
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
