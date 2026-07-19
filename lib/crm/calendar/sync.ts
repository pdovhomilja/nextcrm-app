// lib/crm/calendar/sync.ts
import { prismadb } from "@/lib/prisma";
import { matchCounterparty } from "./match";
import type { CalendarEventInput, EntityLink, UpsertResult } from "./types";

function inviteeName(input: CalendarEventInput): { first: string | null; last: string } {
  const raw =
    (input.rawPayload as { payload?: { name?: string } } | undefined)?.payload?.name ??
    input.counterpartyEmails[0] ??
    "Unknown";
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { first: null, last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

async function resolveHostUserId(hostEmail: string | null | undefined): Promise<string | null> {
  if (!hostEmail) return null;
  const user = await prismadb.users.findFirst({
    where: { email: hostEmail },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function upsertCalendarEvent(input: CalendarEventInput): Promise<UpsertResult> {
  const existing = await prismadb.crm_CalendarEvents.findUnique({
    where: { source_externalId: { source: input.source, externalId: input.externalId } },
  });

  if (existing) {
    if (input.status === "cancelled" && existing.status !== "cancelled") {
      await prismadb.$transaction(async (tx) => {
        await tx.crm_CalendarEvents.update({
          where: { id: existing.id },
          data: { status: "cancelled", rawPayload: (input.rawPayload as object) ?? undefined },
        });
        await tx.crm_Activities.update({
          where: { id: existing.activityId },
          data: { status: "cancelled" },
        });
      });
      return { action: "cancelled", activityId: existing.activityId };
    }
    if (
      input.status === "scheduled" &&
      existing.startAt.getTime() !== input.startAt.getTime()
    ) {
      await prismadb.$transaction(async (tx) => {
        await tx.crm_CalendarEvents.update({
          where: { id: existing.id },
          data: {
            startAt: input.startAt,
            endAt: input.endAt ?? null,
            status: "scheduled",
            rawPayload: (input.rawPayload as object) ?? undefined,
          },
        });
        await tx.crm_Activities.update({
          where: { id: existing.activityId },
          data: { date: input.startAt, status: "scheduled" },
        });
      });
      return { action: "updated", activityId: existing.activityId };
    }
    return { action: "skipped", reason: "unchanged" };
  }

  if (input.status === "cancelled") {
    return { action: "skipped", reason: "cancel-for-unknown" };
  }

  // Cross-source dedup: a Calendly booking also appears on the rep's Google
  // Calendar. Skip google events whose start time + attendee already exist
  // as a calendly-sourced row.
  if (input.source === "google") {
    const sameSlot = await prismadb.crm_CalendarEvents.findMany({
      where: { source: "calendly", startAt: input.startAt },
      select: { attendeeEmails: true },
    });
    const mine = new Set(input.counterpartyEmails.map((e) => e.toLowerCase()));
    const duplicate = sameSlot.some((row) =>
      (row.attendeeEmails as string[]).some((e) => mine.has(e.toLowerCase()))
    );
    if (duplicate) return { action: "skipped", reason: "duplicate-of-calendly" };
  }

  const hostUserId = await resolveHostUserId(input.hostEmail);
  const matched: EntityLink[] = await matchCounterparty(input.counterpartyEmails);

  if (matched.length === 0 && input.source === "google") {
    return { action: "skipped", reason: "no-match" };
  }

  const durationMinutes =
    input.endAt != null
      ? Math.max(0, Math.round((input.endAt.getTime() - input.startAt.getTime()) / 60000))
      : null;

  try {
    const activityId = await prismadb.$transaction(async (tx) => {
      let links = matched;
      if (links.length === 0) {
        // Calendly no-match: a booking from an unknown person is a new lead ->
        // auto-create a Target (spec: source "Book-a-call").
        const { first, last } = inviteeName(input);
        const target = await tx.crm_Targets.create({
          data: {
            first_name: first,
            last_name: last,
            email: input.counterpartyEmails[0] ?? null,
            tags: ["book-a-call"],
            created_by: hostUserId,
          },
        });
        links = [{ entityType: "target", entityId: target.id }];
      }

      const activity = await tx.crm_Activities.create({
        data: {
          type: "meeting",
          title: input.title,
          date: input.startAt,
          duration: durationMinutes,
          status: "scheduled",
          metadata: { calendarSource: input.source },
          createdBy: hostUserId,
          links: { create: links },
        },
      });

      await tx.crm_CalendarEvents.create({
        data: {
          source: input.source,
          externalId: input.externalId,
          iCalUID: input.iCalUID ?? null,
          connectionId: input.connectionId ?? null,
          activityId: activity.id,
          startAt: input.startAt,
          endAt: input.endAt ?? null,
          attendeeEmails: input.counterpartyEmails,
          status: "scheduled",
          rawPayload: (input.rawPayload as object) ?? undefined,
        },
      });

      return activity.id;
    });

    return { action: "created", activityId };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { action: "skipped", reason: "concurrent-duplicate" };
    }
    throw error;
  }
}
