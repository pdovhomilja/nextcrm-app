import db from "@/lib/db";

export async function getBoard(boardId: string) {
  const board = await db.board.findUnique({
    where: {
      id: boardId,
    },
  });
  return board;
}
