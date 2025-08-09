import db from "@/lib/db";

export async function getBoards(userId: string, query?: string) {
  const boards = await db.board.findMany({
    where: {
      access: {
        has: userId,
      },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return boards;
}
