import { AuthorizationError } from "./errors";
import { assertIdString } from "./ids";
import type { AuthzUser } from "./session";
import { prismadb } from "@/lib/prisma";

// Users.id is a uuid column: any other string would make Prisma throw.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reassignment targets must be a real, active user, so work is not parked on a
// disabled account. A partner may assign only to himself, never to an
// internal user. Throws AuthorizationError otherwise.
export async function assertAssignableUser(
  user: AuthzUser,
  assigneeId: string,
): Promise<void> {
  assertIdString(assigneeId);
  if (!UUID.test(assigneeId)) throw new AuthorizationError();
  if (user.role === "partner" && assigneeId !== user.id) throw new AuthorizationError();
  const row = await prismadb.users.findFirst({
    where: { id: assigneeId, userStatus: "ACTIVE" },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}
