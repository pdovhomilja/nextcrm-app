"use server";

import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";
import db from "@/lib/db";
import { triggerBoardEmbeddingUpdate } from "@/lib/ai/embedding-triggers";
import type { Board } from "@/lib/generated/prisma/client";

type EditBoardInput = {
  name: string;
  description: string;
};

export async function editBoard(
  boardId: string,
  data: EditBoardInput
): Promise<Board | { error: string }> {
  const session = await auth();

  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) {
    return { error: "User not found" };
  }

  const existing = await db.board.findUnique({ where: { id: boardId } });
  if (!existing) {
    return { error: "Board not found" };
  }

  const userCanEdit =
    existing.createdBy === user.id || existing.access.includes(user.id);
  if (!userCanEdit) {
    return { error: "Forbidden" };
  }

  try {
    const updated = await db.board.update({
      where: { id: boardId },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    // Queue embedding refresh (non-blocking)
    triggerBoardEmbeddingUpdate(boardId).catch((error) => {
      console.error("Failed to queue board embedding update:", error);
    });

    return updated;
  } catch (error) {
    console.error("Failed to edit board", error);
    return { error: "Failed to edit board" };
  }
}
