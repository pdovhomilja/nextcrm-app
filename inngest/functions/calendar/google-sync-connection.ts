import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import { normalizeGoogleEvent } from "@/lib/crm/calendar/google-normalize";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import type { calendar_v3 } from "googleapis";

const WINDOW_DAYS = 60;

const RATE_LIMIT_MARKERS = [
  "ratelimitexceeded",
  "userratelimitexceeded",
  "quotaexceeded",
];
const REVOCATION_MARKERS = ["invalid_grant", "unauthorized_client"];

// 403 reasons that mean "this account may not perform THIS operation on THIS
// event" rather than "this account's grant is gone". They only occur on the
// outbound write path (events.patch / events.delete against an event the rep
// did not organize, or a calendar they only have reader access to). Treating
// them as a revocation would deactivate an otherwise healthy connection and
// silently kill sync in BOTH directions, so they are excluded alongside the
// rate-limit markers. Genuine grant-level 403s (insufficientPermissions,
// accessNotConfigured, …) still fall through and deactivate as before.
const PER_EVENT_PERMISSION_MARKERS = [
  "forbiddenfornonorganizer",
  "forbidden for non-organizer",
  "cannotchangeorganizer",
  "cannotchangeownattendeestatus",
  "requiredaccesslevel",
];

// `error.code` as a numeric HTTP status comes from gaxios error construction
// (verified against gaxios@7), which is what googleapis uses under the hood.
// Google's error surfaces vary by endpoint:
// - The token endpoint returns HTTP 400 with `error: "invalid_grant"` (or
//   "unauthorized_client") for a revoked/expired refresh token — that must
//   deactivate the connection, even though 400 isn't an auth status.
// - The Calendar API itself uses 401 for a rejected access token.
// - The Calendar API also uses 403 for real auth revocations (e.g.
//   insufficientPermissions), for transient rate-limit errors
//   (rateLimitExceeded / userRateLimitExceeded / quotaExceeded), AND for
//   per-event permission refusals on the outbound write path
//   (forbiddenForNonOrganizer, …). Only the first must deactivate the
//   connection; see PER_EVENT_PERMISSION_MARKERS below.
export function isAuthRevocationError(error: unknown): boolean {
  const err = error as {
    code?: number;
    status?: number;
    message?: string;
    response?: { data?: { error?: string | { message?: string; errors?: Array<{ reason?: string }> } } };
  };

  const status = err?.code ?? err?.status;
  const message = (err?.message ?? "").toLowerCase();

  const responseError = err?.response?.data?.error;
  const responseErrorText =
    typeof responseError === "string"
      ? responseError
      : [
          responseError?.message ?? "",
          ...(responseError?.errors?.map((e) => e.reason ?? "") ?? []),
        ].join(" ");
  const combined = `${message} ${responseErrorText}`.toLowerCase();

  if (REVOCATION_MARKERS.some((marker) => combined.includes(marker))) return true;
  if (status === 401) return true;
  if (status === 403) {
    return ![...RATE_LIMIT_MARKERS, ...PER_EVENT_PERMISSION_MARKERS].some((marker) =>
      combined.includes(marker)
    );
  }
  return false;
}

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
        const message = error instanceof Error ? error.message : String(error);
        await prismadb.calendarConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(isAuthRevocationError(error) ? { isActive: false } : {}),
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
