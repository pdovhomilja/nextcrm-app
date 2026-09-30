import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

// Resend signs webhooks with Svix ("standard webhooks"). The signed content is
// `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256'd with the secret key
// (the base64 payload after the `whsec_` prefix), then base64-encoded. The
// `svix-signature` header is a space-separated list of `v1,<sig>` entries; any
// matching v1 entry is a pass. The timestamp is checked against a tolerance
// window to reject replayed deliveries.
const SVIX_TOLERANCE_SECONDS = 5 * 60;

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyResendWebhook(
  body: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  }
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  // Reject stale or future-dated (replayed) deliveries.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > SVIX_TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && !!sig && timingSafeEqualStr(sig, expected);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const valid = verifyResendWebhook(body, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    type: string;
    data: { message_id?: string; email_id?: string; created_at: string };
  };

  const messageId = event.data.message_id ?? event.data.email_id;
  if (!messageId) return NextResponse.json({ ok: true });

  const send = await prismadb.crm_campaign_sends.findFirst({
    where: { resend_message_id: messageId },
  });

  // fork: not a campaign send — maybe a one-off target outreach email, which
  // shares the campaigns Resend key (tracking on). Record open/click there.
  if (!send) {
    const targetEmail = await prismadb.crm_Target_Email.findFirst({
      where: { resend_message_id: messageId },
      select: { id: true, opened_at: true, clicked_at: true },
    });
    if (targetEmail) {
      if (event.type === "email.opened" && !targetEmail.opened_at) {
        await prismadb.crm_Target_Email.update({
          where: { id: targetEmail.id },
          data: { opened_at: new Date() },
        });
      } else if (event.type === "email.clicked" && !targetEmail.clicked_at) {
        await prismadb.crm_Target_Email.update({
          where: { id: targetEmail.id },
          data: { clicked_at: new Date() },
        });
      }
    }
    return NextResponse.json({ ok: true }); // handled or unknown message
  }

  switch (event.type) {
    case "email.delivered":
      if (send.status === "sent") {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { status: "delivered" },
        });
      }
      break;

    case "email.bounced":
      await prismadb.crm_campaign_sends.update({
        where: { id: send.id },
        data: { status: "bounced", error_message: "Bounced" },
      });
      break;

    case "email.opened":
      if (!send.opened_at) {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { opened_at: new Date() },
        });
      }
      break;

    case "email.clicked":
      if (!send.clicked_at) {
        await prismadb.crm_campaign_sends.update({
          where: { id: send.id },
          data: { clicked_at: new Date() },
        });
      }
      break;
  }

  return NextResponse.json({ ok: true });
}
