import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import { getGoogleOAuthClient } from "@/lib/crm/calendar/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!code) return NextResponse.redirect(`${appUrl}/profile?calendar=error`);

  try {
    const auth = getGoogleOAuthClient();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/profile?calendar=no-refresh-token`);
    }
    auth.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth });
    const primary = await calendar.calendarList.get({ calendarId: "primary" });
    const accountEmail = primary.data.id;
    if (!accountEmail) {
      return NextResponse.redirect(`${appUrl}/profile?calendar=error`);
    }

    await prismadb.calendarConnection.upsert({
      where: {
        userId_provider_accountEmail: {
          userId: session.user.id,
          provider: "google",
          accountEmail,
        },
      },
      update: {
        refreshTokenEncrypted: encrypt(tokens.refresh_token),
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        lastSyncError: null,
        syncToken: null, // force a fresh full-window sync
      },
      create: {
        userId: session.user.id,
        provider: "google",
        accountEmail,
        refreshTokenEncrypted: encrypt(tokens.refresh_token),
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    return NextResponse.redirect(`${appUrl}/profile?calendar=connected`);
  } catch (error) {
    console.error("[google-calendar-callback]", error);
    return NextResponse.redirect(`${appUrl}/profile?calendar=error`);
  }
}
