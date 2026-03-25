import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { createHmac } from "crypto";

function verifyResendSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.RESEND_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", process.env.RESEND_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return signature === `sha256=${expected}`;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Resend-Signature");

  if (!verifyResendSignature(body, signature)) {
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
  if (!send) return NextResponse.json({ ok: true }); // unknown message

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
