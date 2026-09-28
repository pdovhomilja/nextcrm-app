import { prismadb } from "@/lib/prisma";
import { newUserNotify } from "@/lib/new-user-notify";

/**
 * Post-create handling for a newly registered user.
 *
 * Wired into better-auth via `databaseHooks.user.create.after`. It is exported
 * separately so it can be unit-tested without spinning up the full better-auth
 * instance.
 *
 * Behaviour (matches the original intent):
 * - The very first user in the system (count === 1) is promoted to an ACTIVE
 *   admin, so a fresh deployment always has someone who can approve others.
 * - Any subsequent user is left PENDING; outside the demo instance the existing
 *   admins are notified so they can activate the account.
 */
export async function handleUserCreated(userId: string): Promise<void> {
  const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";

  const count = await prismadb.users.count();
  if (count === 1) {
    // First user — make them an active admin.
    await prismadb.users.update({
      where: { id: userId },
      data: { role: "admin", userStatus: "ACTIVE" },
    });
  } else if (!isDemo) {
    // Notify admins about the new pending user.
    const dbUser = await prismadb.users.findUnique({ where: { id: userId } });
    if (dbUser) {
      await newUserNotify(dbUser);
    }
  }
}
