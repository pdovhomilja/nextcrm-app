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

    return step.run("push", async () => {
      const activity = await prismadb.crm_Activities.findUnique({
        where: { id: activityId },
        include: { links: { select: { entityType: true, entityId: true } } },
      });
      const mapping = await prismadb.crm_CalendarEvents.findFirst({
        where: { activityId },
      });
      const connection = activity?.createdBy
        ? await prismadb.calendarConnection.findFirst({
            where: {
              userId: activity.createdBy,
              provider: "google",
              isActive: true,
              scopeLevel: "readwrite",
            },
          })
        : null;

      const decision = decideOutboundAction({
        action,
        activity,
        mapping,
        hasWriteConnection: connection !== null,
      });
      if (decision.do === "skip") return { pushed: false, reason: decision.reason };

      const calendar = getCalendarClientForConnection(connection!);
      try {
        if (decision.do === "delete") {
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
          await prismadb.crm_CalendarEvents.updateMany({
            where: { activityId },
            data: { status: "cancelled" },
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
          await calendar.events.patch({
            calendarId: "primary",
            eventId: decision.eventId,
            sendUpdates: "all",
            requestBody: body,
          });
          await prismadb.crm_CalendarEvents.updateMany({
            where: { activityId },
            data: {
              startAt: activity!.date,
              endAt,
              status: "scheduled",
              attendeeEmails: counterparty ? [counterparty] : [],
            },
          });
          return { pushed: true, did: "patch" };
        }

        const res = await calendar.events.insert({
          calendarId: "primary",
          sendUpdates: "all",
          requestBody: body,
        });
        try {
          await prismadb.crm_CalendarEvents.create({
            data: {
              source: "google",
              externalId: res.data.id!,
              iCalUID: res.data.iCalUID ?? null,
              connectionId: connection!.id,
              activityId,
              startAt: activity!.date,
              endAt,
              attendeeEmails: counterparty ? [counterparty] : [],
              status: "scheduled",
              rawPayload: res.data as object,
            },
          });
        } catch (error) {
          if ((error as { code?: string }).code !== "P2002") throw error;
          // Concurrent duplicate mapping — benign; the event exists on Google.
        }
        return { pushed: true, did: "insert" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prismadb.calendarConnection.update({
          where: { id: connection!.id },
          data: {
            lastSyncError: message.slice(0, 500),
            ...(isAuthRevocationError(error) ? { isActive: false } : {}),
          },
        });
        throw error;
      }
    });
  }
);
