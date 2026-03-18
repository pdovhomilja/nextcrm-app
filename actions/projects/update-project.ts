"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateProject = async (data: {
  id: string;
  title: string;
  description: string;
  visibility: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { id, title, description, visibility } = data;
  if (!title) return { error: "Missing project name" };
  if (!description) return { error: "Missing project description" };

  try {
    await prismadb.boards.update({
      where: { id },
      data: {
        title,
        description,
        visibility,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[UPDATE_PROJECT]", error);
    return { error: "Failed to update project" };
  }
};
