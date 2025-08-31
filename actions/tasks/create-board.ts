"use server";

import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";
import { triggerBoardEmbeddingUpdate } from "@/lib/ai/embedding-triggers";

import db from "@/lib/db";

export async function createBoard(board: {
  name: string;
  description?: string;
  withTemplate?: boolean;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  const user = await getUserByEmail(session?.user?.email);

  if (!user) {
    return { error: "User not found" };
  }
  // Get user's active company ID for multi-tenant isolation
  const companyId = session?.user?.activeCompanyId;

  if (!companyId) {
    return { error: "No active company found" };
  }

  try {
    const newBoard = await db.board.create({
      data: {
        name: board.name,
        description: board.description,
        createdBy: user.id,
        access: [user.id],
        companyId: companyId, // Multi-tenant isolation
      },
    });

    if (board.withTemplate) {
      await db.boardSection.create({
        data: {
          name: "Backlog",
          boardId: newBoard.id,
        },
      });
      await db.boardSection.create({
        data: {
          name: "In Progress",
          boardId: newBoard.id,
        },
      });
      await db.boardSection.create({
        data: {
          name: "Done",
          boardId: newBoard.id,
        },
      });
    }

    // Queue embedding generation (non-blocking)
    if (newBoard.id) {
      triggerBoardEmbeddingUpdate(newBoard.id).catch((error) => {
        console.error("Failed to queue board embedding update:", error);
      });
    }

    return newBoard;
  } catch (error) {
    throw new Error("Failed to create board");
  }
}
