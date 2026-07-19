import type { calendar_v3 } from "googleapis";
import type { CalendarEventInput } from "./types";

export type NormalizeResult = CalendarEventInput | { skip: string };

export function normalizeGoogleEvent(
  ev: calendar_v3.Schema$Event,
  opts: { connectionId: string; accountEmail: string }
): NormalizeResult {
  if (!ev.id) return { skip: "no-id" };

  if (ev.status === "cancelled") {
    // Cancelled payloads are sparse; downstream only needs the identity.
    return {
      source: "google",
      externalId: ev.id,
      iCalUID: ev.iCalUID ?? null,
      connectionId: opts.connectionId,
      title: ev.summary ?? "Meeting",
      startAt: ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date(0),
      endAt: null,
      counterpartyEmails: [],
      hostEmail: opts.accountEmail,
      status: "cancelled",
      rawPayload: ev,
    };
  }

  if (!ev.start?.dateTime) return { skip: "all-day" };

  const attendees = ev.attendees ?? [];
  const self = attendees.find((a) => a.self);
  if (self?.responseStatus === "declined") return { skip: "declined" };

  const repDomain = opts.accountEmail.split("@")[1]?.toLowerCase();
  const counterparty = attendees
    .map((a) => a.email?.toLowerCase())
    .filter((e): e is string => Boolean(e))
    .filter((e) => e !== opts.accountEmail.toLowerCase())
    .filter((e) => e.split("@")[1] !== repDomain);
  if (counterparty.length === 0) return { skip: "no-counterparty" };

  return {
    source: "google",
    externalId: ev.id,
    iCalUID: ev.iCalUID ?? null,
    connectionId: opts.connectionId,
    title: ev.summary ?? "Meeting",
    startAt: new Date(ev.start.dateTime),
    endAt: ev.end?.dateTime ? new Date(ev.end.dateTime) : null,
    counterpartyEmails: counterparty,
    hostEmail: opts.accountEmail,
    status: "scheduled",
    rawPayload: ev,
  };
}
