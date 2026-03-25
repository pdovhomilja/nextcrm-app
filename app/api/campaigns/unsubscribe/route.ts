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

  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>You have been unsubscribed.</h2>
      <p>You will no longer receive emails from this campaign.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
