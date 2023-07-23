import { prismadb } from "@/lib/prisma";

export const getKanbanData = async (boardId: string) => {
  const board = await prismadb.boards.findUnique({
    where: {
      id: boardId,
    },
  });
  //console.log(board, "getBoard - board");

  //Select sections from board with boardId, tasks are included
  let sections = await prismadb.sections.findMany({
    where: {
      board: boardId,
    },
    orderBy: {
      position: "asc",
    },
    include: {
      tasks: {
        orderBy: {
          position: "desc",
        },
      },
    },
  });

  const data = {
    board,
    sections,
  };

  return data;
};
