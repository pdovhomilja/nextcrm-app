"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";

export async function createBoardSection(boardId: string, name: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    const user = await getUserByEmail(session.user.email);
    if (!user?.id || !user?.cid) {
      throw new Error("User not found or missing company information");
    }

    if (!name.trim()) {
      throw new Error("Board section name is required");
    }

    const board = await db.board.findUnique({
      where: {
        id: boardId,
      },
    });

    if (!board) {
      throw new Error("Board not found");
    }

    const lastBoardSection = await db.boardSection.findFirst({
      where: {
        boardId,
      },
      orderBy: {
        position: "desc",
      },
    });

    const newBoardSection = await db.boardSection.create({
      data: {
        name: name.trim(),
        boardId,
        position: lastBoardSection ? lastBoardSection.position + 1 : 0,
      },
    });

    revalidatePath(`/${user.cid}/tasks/${boardId}`);
    return newBoardSection;
  } catch (error) {
    throw new Error(
      `Failed to create board section: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
