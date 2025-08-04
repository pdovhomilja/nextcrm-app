import db from "@/lib/db";

export async function getBoardSections(boardId: string) {
  const boardSections = await db.boardSection.findMany({
    where: {
      boardId,
    },
    orderBy: {
      position: "asc",
    },
    include: {
      tasks: {
        orderBy: {
          position: "asc",
        },
        include: {
          assignedTo: {
            select: {
              name: true,
            },
          },
          createdBy: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return boardSections;
}
