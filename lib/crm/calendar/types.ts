export type CalendarSource = "calendly" | "google";
export type CalendarEventInput = {
  source: CalendarSource;
  externalId: string;
  iCalUID?: string | null;
  connectionId?: string | null;
  title: string;
  startAt: Date;
  endAt?: Date | null;
  counterpartyEmails: string[];
  hostEmail?: string | null;
  status: "scheduled" | "cancelled";
  rawPayload?: unknown;
};
export type EntityLink = { entityType: string; entityId: string };
export type UpsertResult = {
  action: "created" | "updated" | "cancelled" | "skipped";
  reason?: string;
  activityId?: string;
};
