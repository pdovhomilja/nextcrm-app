"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const createSection = async (data: {
  boardId: string;
  title: string;
}) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const { boardId, title } = data;
  if (!title) return { error: "Missing section title" };
  if (!boardId) return { error: "Missing board ID" };

  try {
    await assertCanWriteBoard(user, boardId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    const sectionPosition = await prismadb.sections.count({
      where: { board: boardId },
    });

    const newSection = await prismadb.sections.create({
      data: {
        v: 0,
        board: boardId,
        title,
        position: sectionPosition > 0 ? sectionPosition : 0,
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { data: newSection };
  } catch (error) {
    console.log("[CREATE_SECTION]", error);
    return { error: "Failed to create section" };
  }
};
