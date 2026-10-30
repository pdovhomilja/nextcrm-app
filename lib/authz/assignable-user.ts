import { AuthorizationError } from "./errors";
import { prismadb } from "@/lib/prisma";

// Reassignment targets must be a real, active user, so work is not parked on a
// disabled account. A partner may assign only to himself, never to an
// internal user. Throws AuthorizationError otherwise.
export async function assertAssignableUser(
  assigneeId: string,
  actor?: { id: string; role: string },
): Promise<void> {
  if (actor?.role === "partner" && assigneeId !== actor.id) throw new AuthorizationError();
  const row = await prismadb.users.findFirst({
    where: { id: assigneeId, userStatus: "ACTIVE" },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}
