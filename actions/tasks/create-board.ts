"use server";

import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";

import db from "@/lib/db";

export async function createBoard(board: any) {
  const session = await auth();

  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }
  const user = await getUserByEmail(session?.user?.email);

  if (!user) {
    return { error: "User not found" };
  }
  try {
    const newBoard = await db.board.create({
      data: {
        name: board.name,
        description: board.description,
        createdBy: user.id,
        access: [user.id],
      },
    });

    return newBoard;
  } catch (error) {
    return { error: "Failed to create board" };
  }
}
