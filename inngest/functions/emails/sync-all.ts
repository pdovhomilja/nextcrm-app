import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const emailSyncAll = inngest.createFunction(
  {
    id: "email-sync-all",
    name: "Email: Sync All Accounts",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async () => {
    const accounts = await prismadb.emailAccount.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (accounts.length === 0) return { synced: 0 };

    await inngest.send(
      accounts.map((a) => ({
        name: "email/sync-account" as const,
        data: { accountId: a.id },
      }))
    );

    return { synced: accounts.length };
  }
);
