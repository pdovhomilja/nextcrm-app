"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteProject = async (projectId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!projectId) return { error: "Missing project ID" };

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_PROJECT]", error);
    return { error: "Failed to delete project" };
  }
};
