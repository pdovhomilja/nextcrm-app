import { inngest } from "@/inngest/client";
import { upsertCalendarEvent } from "@/lib/crm/calendar/sync";
import type { CalendarEventInput, CalendarSource } from "@/lib/crm/calendar/types";

type WireEvent = Omit<CalendarEventInput, "startAt" | "endAt" | "source"> & {
  source: CalendarSource;
  startAt: string;
  endAt?: string | null;
};

export const calendarProcessEvent = inngest.createFunction(
  { id: "crm-calendar-process-event", name: "CRM: Process calendar event", triggers: [{ event: "crm/calendar.event.received" }] },
  async ({ event, step }) => {
    const data = event.data as WireEvent;
    return step.run("upsert", () =>
      upsertCalendarEvent({
        ...data,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
      })
    );
  }
);
