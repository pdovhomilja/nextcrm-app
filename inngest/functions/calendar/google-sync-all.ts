import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const googleCalendarSyncAll = inngest.createFunction(
  {
    id: "crm-google-calendar-sync-all",
    name: "CRM: Google Calendar sync (all connections)",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async () => {
    const connections = await prismadb.calendarConnection.findMany({
      where: { isActive: true, provider: "google" },
      select: { id: true },
    });
    if (connections.length === 0) return { synced: 0 };

    await inngest.send(
      connections.map((c) => ({
        name: "crm/calendar.google-sync" as const,
        data: { connectionId: c.id },
      }))
    );
    return { synced: connections.length };
  }
);
