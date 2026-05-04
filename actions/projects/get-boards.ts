import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import {
  requireAuthenticated,
  boardReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getBoards = async (_userId?: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  const data = await prismadb.boards.findMany({
    where: boardReadScopeWhere(user),
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
      // Include watchers through BoardWatchers junction table
      ...junctionTableHelpers.includeWatchersWithUsers(),
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return data;
};
