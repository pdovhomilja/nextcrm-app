"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getKanbanData = async (boardId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const board = await prismadb.boards.findUnique({
    where: {
      id: boardId,
    },
  });

  // Verify ownership
  if (board && board.organizationId !== session.user.organizationId) {
    throw new Error("Unauthorized: Access denied to this resource");
  }

  //Select sections from board with boardId, tasks are included
  let sections = await prismadb.sections.findMany({
    where: {
      board: boardId,
      organizationId: session.user.organizationId,
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
