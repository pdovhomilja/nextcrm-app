import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const send = await prismadb.crm_campaign_sends.findUnique({
    where: { unsubscribe_token: token },
  });

  if (!send) {
    return new NextResponse("Unsubscribe link not found.", { status: 404 });
  }

  if (!send.unsubscribed_at) {
    await prismadb.crm_campaign_sends.update({
      where: { unsubscribe_token: token },
      data: { unsubscribed_at: new Date() },
    });
  }

  // Global suppression: never email this address again, from any campaign.
  // Best-effort — the user-visible unsubscribe confirmation must not fail
  // just because this secondary write hit a transient DB error.
  try {
    await prismadb.crm_Targets.updateMany({
      where: {
        do_not_email: false,
        OR: [{ id: send.target_id }, { email: send.email }],
      },
      data: { do_not_email: true, do_not_email_at: new Date() },
    });
  } catch (error) {
    console.error("[unsubscribe] global suppression failed:", error);
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>You have been unsubscribed.</h2>
      <p>You will no longer receive emails from this campaign.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
