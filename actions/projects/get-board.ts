"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getBoard = async (id: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const board = await prismadb.boards.findFirst({
    where: {
      id: id,
      organizationId: session.user.organizationId,
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
