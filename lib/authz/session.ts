import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AppRole, mapLegacyRole } from "./roles";

export { isManagerOrAdmin } from "./roles";
import { AuthenticationError, AuthorizationError } from "./errors";

export interface AuthzUser {
  id: string;
  role: AppRole;
}

/**
 * The signed-in user. Refuses a partner unless the caller opts in with
 * { partner: true } (deny by default, partner-role spec ticket 4).
 */
export async function requireAuthenticated(opts?: { partner?: boolean }): Promise<AuthzUser> {
  const session = await getSession(opts);
  const userId = session?.user?.id;
  if (!userId) throw new AuthenticationError();

  const dbUser = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!dbUser) throw new AuthenticationError();
  if (dbUser.role === "partner" && !opts?.partner) throw new AuthenticationError();

  return { id: dbUser.id, role: mapLegacyRole(dbUser.role) };
}

export async function requireRole(
  allowedRoles: ReadonlyArray<AppRole>
): Promise<AuthzUser> {
  const user = await requireAuthenticated();
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError();
  }
  return user;
}

export function isAdmin(user: AuthzUser): boolean {
  return user.role === "admin";
}
