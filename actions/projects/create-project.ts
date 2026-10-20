"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { invalidateAfterBoardWrite } from "@/lib/server/invalidate-after-write";
import { requireFeature, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { SCRUM_BOARD_SECTIONS } from "@/lib/projects/board-templates";

export const createProject = async (data: {
  title: string;
  description: string;
  visibility: string;
}) => {
  let user;
  try {
    user = await requireFeature("projects", "create");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }

  const { title, description, visibility } = data;
  if (!title) return { error: "Missing project name" };
  if (!description) return { error: "Missing project description" };

  try {
    const boardsCount = await prismadb.boards.count();

    const newBoard = await prismadb.boards.create({
      data: {
        v: 0,
        user: user.id,
        title,
        description,
        position: boardsCount > 0 ? boardsCount : 0,
        visibility,
        sharedWith: [user.id],
        createdBy: user.id,
      },
    });

    await prismadb.sections.createMany({
      data: SCRUM_BOARD_SECTIONS.map((title, position) => ({
        v: 0,
        board: newBoard.id,
        title,
        position,
      })),
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    invalidateAfterBoardWrite(user);
    return { data: newBoard };
  } catch (error) {
    console.log("[CREATE_PROJECT]", error);
    return { error: "Failed to create project" };
  }
};
