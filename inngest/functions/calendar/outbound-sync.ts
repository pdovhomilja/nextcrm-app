import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getCalendarClientForConnection } from "@/lib/crm/calendar/google";
import {
  decideOutboundAction,
  buildOutboundEvent,
  resolveCounterpartyEmail,
  type OutboundAction,
} from "@/lib/crm/calendar/outbound";
import { isAuthRevocationError } from "@/inngest/functions/calendar/google-sync-connection";

export const calendarOutboundSync = inngest.createFunction(
  {
    id: "crm-calendar-outbound-sync",
    name: "CRM: Calendar outbound sync",
    retries: 3,
    triggers: [{ event: "crm/calendar.outbound-sync" }],
  },
  async ({ event, step }) => {
    const { activityId, action } = event.data as {
      activityId: string;
      action: OutboundAction;
    };

    // Everything below is plain (unmemoized) code that reruns on every
    // attempt — cheap, read-only lookups. Only genuine external side effects
    // (the Google API call and the mapping write) go through step.run, and
    // each is its own step so a retry after a partial failure resumes at the
    // right place instead of redoing an already-committed Google insert.
    const activity = await prismadb.crm_Activities.findUnique({
      where: { id: activityId },
      include: { links: { select: { entityType: true, entityId: true } } },
    });
    const mapping = await prismadb.crm_CalendarEvents.findFirst({
      where: { activityId },
      select: { source: true, externalId: true, status: true, connectionId: true },
    });

    let connection = null as Awaited<
      ReturnType<typeof prismadb.calendarConnection.findFirst>
    >;
    if (activity?.createdBy) {
      const connectionWhere = {
        userId: activity.createdBy,
        provider: "google",
        isActive: true,
        scopeLevel: "readwrite",
      } as const;

      // Prefer the connection that owns the existing mapping (if any) so a
      // patch/delete always targets the account that created the event. Fall
      // back to a deterministic order so two active connections don't pick
      // an arbitrary one from run to run.
      if (mapping?.connectionId) {
        connection = await prismadb.calendarConnection.findFirst({
          where: { ...connectionWhere, id: mapping.connectionId },
        });
      }
      if (!connection) {
        connection = await prismadb.calendarConnection.findFirst({
          where: connectionWhere,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
      }
    }

    const decision = decideOutboundAction({
      action,
      activity,
      mapping,
      hasWriteConnection: connection !== null,
    });
    if (decision.do === "skip") return { pushed: false, reason: decision.reason };

    // Narrowly scoped to the Google API call — a Prisma failure writing the
    // mapping is a different failure mode and must not be recorded as a
    // connection-level sync error.
    async function recordGoogleSyncError(error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await prismadb.calendarConnection.update({
          where: { id: connection!.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(isAuthRevocationError(error) ? { isActive: false } : {}),
          },
        });
      } catch {
        // Don't let a failure recording the error mask the original one.
      }
    }

    if (decision.do === "delete") {
      try {
        await step.run("delete-google-event", async () => {
          const calendar = getCalendarClientForConnection(connection!);
          try {
            await calendar.events.delete({
              calendarId: "primary",
              eventId: decision.eventId,
              sendUpdates: "all",
            });
          } catch (error) {
            const code = (error as { code?: number }).code;
            // Already gone on Google's side is success.
            if (code !== 404 && code !== 410) throw error;
          }
          return null;
        });
      } catch (error) {
        await recordGoogleSyncError(error);
        throw error;
      }

      // Kept as history (not deleted) so a later reschedule can tell this
      // mapping no longer points at a live Google event.
      await step.run("mark-mapping-cancelled", async () => {
        await prismadb.crm_CalendarEvents.updateMany({
          where: { activityId },
          data: { status: "cancelled" },
        });
      });
      return { pushed: true, did: "delete" };
    }

    const counterparty = await resolveCounterpartyEmail(activity!.links);
    const body = buildOutboundEvent(
      {
        title: activity!.title,
        description: activity!.description,
        date: activity!.date,
        duration: activity!.duration,
      },
      counterparty
    );
    const endAt = new Date(body.end!.dateTime as string);

    if (decision.do === "patch") {
      try {
        await step.run("patch-google-event", async () => {
          const calendar = getCalendarClientForConnection(connection!);
          await calendar.events.patch({
            calendarId: "primary",
            eventId: decision.eventId,
            sendUpdates: "all",
            requestBody: body,
          });
          return null;
        });
      } catch (error) {
        await recordGoogleSyncError(error);
        throw error;
      }

      await step.run("update-mapping-patch", async () => {
        await prismadb.crm_CalendarEvents.updateMany({
          where: { activityId },
          data: {
            startAt: activity!.date,
            endAt,
            status: "scheduled",
            attendeeEmails: counterparty ? [counterparty] : [],
          },
        });
      });
      return { pushed: true, did: "patch" };
    }

    // decision.do === "insert" — the Google insert and the mapping write are
    // separate steps. `step.run` memoizes its result once it succeeds, so a
    // retry after the mapping write fails (or after a timeout that raced a
    // successful Google commit) resumes at the mapping write instead of
    // re-inserting a second real event and emailing a second invite. Only
    // JSON-safe values (ids, the raw payload) cross the step boundary —
    // Dates are recomputed from `body` outside of any step, so there's
    // nothing to revive.
    let inserted: { id: string; iCalUID: string | null; rawPayload: object };
    try {
      inserted = await step.run("insert-google-event", async () => {
        const calendar = getCalendarClientForConnection(connection!);
        const res = await calendar.events.insert({
          calendarId: "primary",
          sendUpdates: "all",
          requestBody: body,
        });
        return {
          id: res.data.id!,
          iCalUID: res.data.iCalUID ?? null,
          rawPayload: res.data as object,
        };
      });
    } catch (error) {
      await recordGoogleSyncError(error);
      throw error;
    }

    await step.run("create-mapping", async () => {
      try {
        await prismadb.crm_CalendarEvents.create({
          data: {
            source: "google",
            externalId: inserted.id,
            iCalUID: inserted.iCalUID,
            connectionId: connection!.id,
            activityId,
            startAt: activity!.date,
            endAt,
            attendeeEmails: counterparty ? [counterparty] : [],
            status: "scheduled",
            rawPayload: inserted.rawPayload,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
        // Concurrent duplicate mapping — benign; the event exists on Google.
      }
    });
    return { pushed: true, did: "insert" };
  }
);
