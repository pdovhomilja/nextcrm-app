"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireFeature,
  assertCanWriteBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateProject = async (data: {
  id: string;
  title: string;
  description: string;
  visibility: string;
}) => {
  let user;
  try {
    user = await requireFeature("projects", "edit");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  const { id, title, description, visibility } = data;
  if (!title) return { error: "Missing project name" };
  if (!description) return { error: "Missing project description" };

  try {
    await assertCanWriteBoard(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.boards.update({
      where: { id },
      data: {
        title,
        description,
        visibility,
        updatedBy: user.id,
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
