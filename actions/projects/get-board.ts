import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers, extractWatcherUsers } from "@/lib/junction-helpers";
import {
  requireAuthenticated,
  assertCanReadBoard,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getBoard = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadBoard(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  const board = await prismadb.boards.findFirst({
    where: {
      id: id,
      deletedAt: null,
    },
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
      // Include watchers through BoardWatchers junction table
      ...junctionTableHelpers.includeWatchersWithUsers(),
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
