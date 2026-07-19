import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import { normalizeGoogleEvent } from "@/lib/crm/calendar/google-normalize";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import type { calendar_v3 } from "googleapis";

const WINDOW_DAYS = 60;
// `error.code` as a numeric HTTP status comes from gaxios error construction
// (verified against gaxios@7), which is what googleapis uses under the hood.
const AUTH_ERROR_CODES = new Set([401, 403]);

export const googleCalendarSyncConnection = inngest.createFunction(
  {
    id: "crm-google-calendar-sync-connection",
    name: "CRM: Google Calendar sync (one connection)",
    retries: 3,
    triggers: [{ event: "crm/calendar.google-sync" }],
  },
  async ({ event, step }) => {
    const { connectionId } = event.data as { connectionId: string };

    const result = await step.run("sync", async () => {
      const connection = await prismadb.calendarConnection.findUnique({
        where: { id: connectionId },
      });
      if (!connection || !connection.isActive) return { skipped: true };

      const calendar = getCalendarClientForConnection(connection);
      const items: calendar_v3.Schema$Event[] = [];
      let syncToken = connection.syncToken;
      let nextSyncToken: string | null | undefined;

      const list = async (params: calendar_v3.Params$Resource$Events$List) => {
        let pageToken: string | undefined;
        do {
          const res = await calendar.events.list({ ...params, pageToken, maxResults: 250 });
          items.push(...(res.data.items ?? []));
          pageToken = res.data.nextPageToken ?? undefined;
          nextSyncToken = res.data.nextSyncToken ?? nextSyncToken;
        } while (pageToken);
      };

      const counts = { created: 0, updated: 0, cancelled: 0, skipped: 0 };

      try {
        if (syncToken) {
          try {
            await list({ calendarId: "primary", singleEvents: true, syncToken });
          } catch (error) {
            const code = (error as { code?: number }).code;
            if (code !== 410) throw error;
            // Sync token expired: fall back to a full window sync.
            syncToken = null;
            items.length = 0;
          }
        }
        if (!syncToken) {
          const now = Date.now();
          await list({
            calendarId: "primary",
            singleEvents: true,
            timeMin: new Date(now - WINDOW_DAYS * 86400000).toISOString(),
            timeMax: new Date(now + WINDOW_DAYS * 86400000).toISOString(),
          });
        }

        // A retry after a mid-loop failure re-processes already-synced events from
        // scratch, which is safe because upsertCalendarEvent is idempotent per
        // (source, externalId).
        for (const ev of items) {
          const normalized = normalizeGoogleEvent(ev, {
            connectionId: connection.id,
            accountEmail: connection.accountEmail,
          });
          if ("skip" in normalized) {
            counts.skipped += 1;
            continue;
          }
          const res = await upsertCalendarEvent(normalized);
          counts[res.action] += 1;
        }
      } catch (error) {
        const code = (error as { code?: number }).code;
        const message = error instanceof Error ? error.message : String(error);
        await prismadb.calendarConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(code !== undefined && AUTH_ERROR_CODES.has(code) ? { isActive: false } : {}),
          },
        });
        throw error;
      }

      await prismadb.calendarConnection.update({
        where: { id: connection.id },
        data: {
          syncToken: nextSyncToken ?? syncToken,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      });

      return { events: items.length, ...counts };
    });

    return result;
  }
);
