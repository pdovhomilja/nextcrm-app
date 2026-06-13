import { validateApiToken } from "@/lib/api-tokens";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { mapLegacyRole } from "@/lib/authz/roles";
import type { AuthzUser } from "@/lib/authz";

// McpUser carries the full authorization context (id + role) so tool handlers
// can apply the same owner/role scoping as the server actions.
// Shape-compatible with AuthzUser.
export type McpUser = AuthzUser;

export async function getMcpUser(): Promise<McpUser> {
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  let userId: string | null = null;

  if (bearer?.startsWith("nxtc__")) {
    userId = await validateApiToken(bearer);
  } else if (process.env.NODE_ENV === "development") {
    // Development-only fallback: better-auth session cookie
    // Not used in production — session cannot substitute for token revocation
    const session = await getSession();
    userId = session?.user?.id ?? null;
  }

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Resolve the authorization role so handlers can enforce object-level access
  // (GHSA-c9vg-c532-ppqx): without the role, scope helpers cannot distinguish
  // owners from admins/managers.
  const dbUser = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!dbUser) {
    throw new Error("Unauthorized");
  }

  return { id: dbUser.id, role: mapLegacyRole(dbUser.role) };
}
