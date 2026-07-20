import type { calendar_v3 } from "googleapis";
import { prismadb } from "@/lib/prisma";

export type OutboundAction = "upsert" | "cancel";

export type OutboundDecision =
  | { do: "skip"; reason: string }
  | { do: "insert" }
  | { do: "patch"; eventId: string }
  | { do: "delete"; eventId: string };

const DEFAULT_DURATION_MINUTES = 30;

// Google only sets `organizer.self` when the authenticated account IS the
// organizer; a customer-organized meeting that lands on the rep's calendar
// carries `organizer: { email: "jane@client.com" }` with no `self`. Writing to
// such an event is rejected with 403 forbiddenForNonOrganizer, so the push has
// to be skipped rather than attempted.
//
// An ABSENT `organizer` means "unknown", not "not mine": the payload we persist
// for events we created ourselves is whatever `events.insert` returned, and
// pre-existing mapping rows may predate this check entirely. Treat unknown as
// organized-by-us so this guard only ever suppresses pushes we can positively
// prove would fail.
function isOrganizedBySelf(rawPayload: unknown): boolean {
  const organizer = (rawPayload as { organizer?: { self?: boolean } } | null | undefined)
    ?.organizer;
  if (!organizer) return true;
  return organizer.self === true;
}

export function decideOutboundAction(input: {
  action: OutboundAction;
  activity: { type: string; date: Date | null; status: string; deletedAt: Date | null } | null;
  mapping: {
    source: string;
    externalId: string;
    status: string;
    rawPayload?: unknown;
  } | null;
  hasWriteConnection: boolean;
  now?: Date;
}): OutboundDecision {
  const { action, activity, mapping, hasWriteConnection } = input;
  if (!activity) return { do: "skip", reason: "not-found" };
  if (activity.type !== "meeting") return { do: "skip", reason: "not-a-meeting" };
  if (mapping?.source === "calendly") return { do: "skip", reason: "calendly-owned" };
  if (!hasWriteConnection) return { do: "skip", reason: "no-write-connection" };

  const isCancellation =
    action === "cancel" || activity.status === "cancelled" || activity.deletedAt !== null;
  if (isCancellation) {
    return mapping?.source === "google"
      ? { do: "delete", eventId: mapping.externalId }
      : { do: "skip", reason: "never-pushed" };
  }

  if (!activity.date) return { do: "skip", reason: "no-date" };

  // Never push a meeting that has already happened. Both the insert and the
  // patch path call Google with sendUpdates:"all", so any push here mails
  // every attendee an invite (or an "Updated invitation") for an event in the
  // past. `status === "completed"` is the explicit post-meeting write:
  // `updateActivity` accepts `outcome`, and logging a call outcome is the
  // single most common thing a rep does after a meeting. Checked AFTER the
  // cancellation branch above, so cancelling a meeting still tears the Google
  // event down regardless of when it was.
  if (activity.status === "completed") return { do: "skip", reason: "already-completed" };

  // A mapping whose row was left behind by a prior cancellation (see the
  // delete branch in outbound-sync.ts, which keeps the row as history rather
  // than deleting it) no longer refers to a live Google event — patching it
  // would 404. Treat it like there's no mapping at all.
  if (!mapping || mapping.status === "cancelled") {
    // Nothing was ever pushed, so nothing on Google can diverge from the CRM.
    // A past date here means a meeting the rep never got round to marking
    // complete, or one back-dated and logged after the fact — creating an
    // event for it would mail every attendee an invite to something that
    // already happened. This skip is deliberately scoped to the no-mapping
    // case: once a live Google event exists it must keep tracking the CRM
    // (see below), including when a rep back-dates it.
    if (activity.date.getTime() < (input.now ?? new Date()).getTime()) {
      return { do: "skip", reason: "in-the-past" };
    }
    return { do: "insert" };
  }

  // A live mapping means the customer is already holding an invite for the
  // OLD date. Skipping a past-dated edit here would strand that invite: move
  // a meeting from Aug 1 to Jul 15 and Google would keep advertising Aug 1
  // forever. Patch (or, via the cancellation branch above, delete) so Google
  // never diverges from the CRM. This does not reopen the "rep logs notes on
  // a meeting that already happened" case — that is a status/outcome edit,
  // caught by the `already-completed` skip above and, being date-less,
  // producing an identical patch body in any event.

  // Meetings organized by the customer are ingested by the inbound poller and
  // get a live google-sourced mapping like any other. Patching one is a
  // guaranteed 403 forbiddenForNonOrganizer.
  if (!isOrganizedBySelf(mapping.rawPayload)) {
    return { do: "skip", reason: "not-organizer" };
  }

  return { do: "patch", eventId: mapping.externalId };
}

export function buildOutboundEvent(
  activity: { title: string; description: string | null; date: Date; duration: number | null },
  counterpartyEmail: string | null
): calendar_v3.Schema$Event {
  const start = activity.date;
  const end = new Date(
    start.getTime() + (activity.duration ?? DEFAULT_DURATION_MINUTES) * 60000
  );
  return {
    summary: activity.title,
    description: activity.description ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    ...(counterpartyEmail ? { attendees: [{ email: counterpartyEmail }] } : {}),
  };
}

// Spec: contact -> target -> lead; first linked entity with an email.
export async function resolveCounterpartyEmail(
  links: Array<{ entityType: string; entityId: string }>
): Promise<string | null> {
  const byType = (t: string) => links.filter((l) => l.entityType === t);
  for (const link of byType("contact")) {
    const row = await prismadb.crm_Contacts.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true, personal_email: true },
    });
    const email = row?.email ?? row?.personal_email;
    if (email) return email.toLowerCase();
  }
  for (const link of byType("target")) {
    const row = await prismadb.crm_Targets.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true, personal_email: true, company_email: true },
    });
    const email = row?.email ?? row?.personal_email ?? row?.company_email;
    if (email) return email.toLowerCase();
  }
  for (const link of byType("lead")) {
    const row = await prismadb.crm_Leads.findFirst({
      where: { id: link.entityId, deletedAt: null },
      select: { email: true },
    });
    if (row?.email) return row.email.toLowerCase();
  }
  return null;
}
