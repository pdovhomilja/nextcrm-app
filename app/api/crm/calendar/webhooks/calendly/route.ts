import { NextRequest, NextResponse } from "next/server";
import { verifyCalendlySignature } from "@/lib/crm/calendar/calendly-signature";
import { getCalendlySettings } from "@/lib/crm/calendar/calendly-settings";
import { inngest } from "@/inngest/client";

type CalendlyWebhookBody = {
  event: string;
  payload: {
    uri?: string;
    email?: string;
    name?: string;
    scheduled_event?: {
      uri?: string;
      name?: string;
      start_time?: string;
      end_time?: string;
      event_memberships?: Array<{ user_email?: string }>;
    };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const { signingKey } = await getCalendlySettings();

  if (
    !signingKey ||
    !verifyCalendlySignature(
      rawBody,
      req.headers.get("calendly-webhook-signature"),
      signingKey
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: CalendlyWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Never bounce Calendly into disabling the subscription over a bad payload.
    return NextResponse.json({ ok: true });
  }

  if (body.event !== "invitee.created" && body.event !== "invitee.canceled") {
    return NextResponse.json({ ok: true });
  }

  const p = body.payload;
  const ev = p.scheduled_event;
  if (!p.uri || !ev?.start_time) return NextResponse.json({ ok: true });

  await inngest.send({
    name: "crm/calendar.event.received",
    data: {
      source: "calendly",
      externalId: p.uri,
      iCalUID: null,
      connectionId: null,
      title: ev.name ?? "Calendly meeting",
      startAt: ev.start_time,
      endAt: ev.end_time ?? null,
      counterpartyEmails: p.email ? [p.email] : [],
      hostEmail: ev.event_memberships?.[0]?.user_email ?? null,
      status: body.event === "invitee.canceled" ? "cancelled" : "scheduled",
      rawPayload: body,
    },
  });

  return NextResponse.json({ ok: true });
}
