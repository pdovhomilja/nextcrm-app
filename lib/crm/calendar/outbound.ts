import type { calendar_v3 } from "googleapis";
import { prismadb } from "@/lib/prisma";

export type OutboundAction = "upsert" | "cancel";

export type OutboundDecision =
  | { do: "skip"; reason: string }
  | { do: "insert" }
  | { do: "patch"; eventId: string }
  | { do: "delete"; eventId: string };

const DEFAULT_DURATION_MINUTES = 30;

export function decideOutboundAction(input: {
  action: OutboundAction;
  activity: { type: string; date: Date | null; status: string; deletedAt: Date | null } | null;
  mapping: { source: string; externalId: string; status: string } | null;
  hasWriteConnection: boolean;
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
  // A mapping whose row was left behind by a prior cancellation (see the
  // delete branch in outbound-sync.ts, which keeps the row as history rather
  // than deleting it) no longer refers to a live Google event — patching it
  // would 404. Treat it like there's no mapping at all.
  return mapping && mapping.status !== "cancelled"
    ? { do: "patch", eventId: mapping.externalId }
    : { do: "insert" };
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
