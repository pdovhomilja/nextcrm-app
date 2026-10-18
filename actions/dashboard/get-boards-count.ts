import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { boardReadScopeWhere } from "@/lib/authz/scopes/crm";

// Scoped to what the caller can read (no global totals for user/partner).
export const getBoardsCount = async () => {
  try {
    const user = await requireAuthenticated({ partner: true });
    return await prismadb.boards.count({ where: boardReadScopeWhere(user) });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};
