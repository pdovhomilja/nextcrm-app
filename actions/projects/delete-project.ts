"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteProject = async (projectId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!projectId) return { error: "Missing project ID" };

  try {
    const sections = await prismadb.sections.findMany({
      where: { board: projectId },
    });

    for (const section of sections) {
      await prismadb.tasks.deleteMany({
        where: { section: section.id },
      });
    }

    await prismadb.sections.deleteMany({
      where: { board: projectId },
    });

    await prismadb.boards.delete({
      where: { id: projectId },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_PROJECT]", error);
    return { error: "Failed to delete project" };
  }
};
