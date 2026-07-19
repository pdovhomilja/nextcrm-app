import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import { getGoogleOAuthClient, scopeLevelFromGrantedScopes } from "@/lib/crm/calendar/google";

const STATE_COOKIE = "gcal_oauth_state";
const STATE_COOKIE_PATH = "/api/profile/calendar-connections/google";

function redirectAndClearState(url: string) {
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: STATE_COOKIE_PATH,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!code) return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=error`);

  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const queryState = req.nextUrl.searchParams.get("state");
  if (!cookieState || !queryState || cookieState !== queryState) {
    return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=state-mismatch`);
  }

  try {
    const auth = getGoogleOAuthClient();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=no-refresh-token`);
    }
    auth.setCredentials(tokens);
    const scopeLevel = scopeLevelFromGrantedScopes(tokens.scope);

    const calendar = google.calendar({ version: "v3", auth });
    const primary = await calendar.calendarList.get({ calendarId: "primary" });
    const accountEmail = primary.data.id;
    if (!accountEmail) {
      return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=error`);
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
        scopeLevel,
      },
      create: {
        userId: session.user.id,
        provider: "google",
        accountEmail,
        refreshTokenEncrypted: encrypt(tokens.refresh_token),
        accessTokenEncrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopeLevel,
      },
    });

    return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=connected`);
  } catch (error) {
    console.error(
      "[google-calendar-callback]",
      error instanceof Error ? error.message : String(error)
    );
    return redirectAndClearState(`${appUrl}/profile?tab=calendar&calendar=error`);
  }
}
