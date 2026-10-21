import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";
import {
  requireAuthenticated,
  boardReadScopeWhere,
  AuthenticationError,
  type AuthzUser,
} from "@/lib/authz";
import { boardsListTag } from "@/lib/server/platform-cache-tags";
import type { AppRole } from "@/lib/authz/roles";

async function loadBoards(userId: string, role: AppRole) {
  const user: AuthzUser = { id: userId, role };
  return prismadb.boards.findMany({
    where: boardReadScopeWhere(user),
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
      ...junctionTableHelpers.includeWatchersWithUsers(),
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

function getCachedBoards(userId: string, role: AppRole) {
  return unstable_cache(
    () => loadBoards(userId, role),
    ["boards-list-v1", userId, role],
    { revalidate: 90, tags: [boardsListTag(userId, role)] }
  )();
}

export const getBoards = async (_userId?: string) => {
  try {
    const user = await requireAuthenticated();
    return getCachedBoards(user.id, user.role);
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
};
