import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { getResendInboundWebhookSecret } from "@/lib/email/resend-webhook-secret";
import { inngest } from "@/inngest/client";

type ResendInboundWebhookEvent = {
  type: string;
  data?: {
    email_id?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
  };
};

function verifyInboundWebhook(req: NextRequest, rawBody: string): boolean {
  const secret = getResendInboundWebhookSecret();
  if (!secret) return false;

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (svixId && svixTimestamp && svixSignature) {
    try {
      const wh = new Webhook(secret);
      wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
      return true;
    } catch (err) {
      console.error("[resend-inbound] Svix verification failed:", err);
      return false;
    }
  }

  const auth = req.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}` || auth === secret) return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!getResendInboundWebhookSecret()) {
    return NextResponse.json(
      { error: "RESEND_INBOUND_WEBHOOK_SECRET (or RESEND_WEBHOOK_SECRET) is not configured" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();

  if (!verifyInboundWebhook(req, rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: ResendInboundWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ResendInboundWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  const webhookMeta = {
    to: event.data?.to,
    cc: event.data?.cc,
    bcc: event.data?.bcc,
    received_for: event.data?.received_for,
  };

  try {
    await inngest.send({
      name: "email/resend-inbound",
      data: {
        resendEmailId: emailId,
        to: webhookMeta.to,
        cc: webhookMeta.cc,
        bcc: webhookMeta.bcc,
        received_for: webhookMeta.received_for,
      },
    });
    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  } catch (err) {
    console.error("[resend-inbound] Queue failed:", err);
    return NextResponse.json({ error: "Queue failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Resend inbound webhook endpoint",
    subscribeTo: "email.received",
    docs: "https://resend.com/docs/dashboard/receiving/create-receiving-webhook",
  });
}
