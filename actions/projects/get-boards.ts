import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export const getBoards = async (userId: string) => {
  if (!userId) {
    return null;
  }
  const data = await prismadb.boards.findMany({
    where: {
      OR: [
        {
          user: userId,
        },
        {
          visibility: "public",
        },
        // Find boards where user is a watcher using BoardWatchers junction table
        junctionTableHelpers.watchedByUser(userId),
      ],
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
    orderBy: {
      updatedAt: "desc",
    },
  });
  return data;
};
