import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getKanbanData = async (boardId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { board: null, sections: [] };
    throw e;
  }

  try {
    await assertCanReadBoard(user, boardId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { board: null, sections: [] };
    throw e;
  }

  const board = await prismadb.boards.findUnique({
    where: {
      id: boardId,
    },
  });

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
