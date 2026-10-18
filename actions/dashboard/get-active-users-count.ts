import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { userDirectoryWhere } from "@/lib/authz/scopes/users";

// Scoped to what the caller can read (no global totals for user/partner).
export const getActiveUsersCount = async () => {
  try {
    const user = await requireAuthenticated({ partner: true });
    return await prismadb.users.count({ where: { userStatus: "ACTIVE", ...userDirectoryWhere(user) } });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};
