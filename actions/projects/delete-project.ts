"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { invalidateAfterBoardWrite } from "@/lib/server/invalidate-after-write";
import {
  requireFeature,
  assertCanWriteBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteProject = async (projectId: string) => {
  let user;
  try {
    user = await requireFeature("projects", "delete");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  if (!projectId) return { error: "Missing project ID" };

  try {
    await assertCanWriteBoard(user, projectId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    invalidateAfterBoardWrite(user);
    return { success: true };
  } catch (error) {
    console.log("[DELETE_PROJECT]", error);
    return { error: "Failed to delete project" };
  }
};
