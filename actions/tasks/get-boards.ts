import db from "@/lib/db";

export async function getBoards(userId: string) {
  const boards = await db.board.findMany({
    where: {
      access: {
        has: userId,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return boards;
}
