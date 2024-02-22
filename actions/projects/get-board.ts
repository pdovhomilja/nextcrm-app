import { prismadb } from "@/lib/prisma";

export const getBoard = async (id: string) => {
  const board = await prismadb.boards.findFirst({
    where: {
      id: id,
    },
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
    },
  });

  const sections = await prismadb.sections.findMany({
    where: {
      board: id,
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
