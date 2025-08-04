"use server";

import db from "@/lib/db";

export async function deleteBoard(boardId: string) {
  await db.board.delete({
    where: {
      id: boardId,
    },
  });

  return { message: "Board deleted successfully" };
}
