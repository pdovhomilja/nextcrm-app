import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import {
  getGoogleOAuthClient,
  scopeLevelFromGrantedScopes,
} from "@/lib/crm/calendar/google";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  parsePendingStates,
  serializePendingStates,
  statesEqual,
} from "@/lib/crm/calendar/oauth-state";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 600,
  path: STATE_COOKIE_PATH,
};

// Redirect back to the profile page, writing the still-pending OAuth states
// back to the cookie so OTHER concurrently-open connect tabs keep working.
// `states` is the consumed list with the matched state already removed; an
// empty list clears the cookie. The target has no locale prefix on purpose:
// /profile is a non-API route, so the next-intl middleware (proxy.ts) adds the
// prefix as it does for every other locale-less path.
function redirectWithStates(url: string, states: string[]) {
  const res = NextResponse.redirect(url);
  if (states.length === 0) {
    res.cookies.set(STATE_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  } else {
    res.cookies.set(STATE_COOKIE, serializePendingStates(states), COOKIE_OPTIONS);
  }
  return res;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!code) return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=error`, []);

  const queryState = req.nextUrl.searchParams.get("state");
  const pending = parsePendingStates(req.cookies.get(STATE_COOKIE)?.value);
  // Constant-time comparison per candidate — the state is the connect flow's
  // CSRF token and must not be compared with `!==`.
  const matchIndex = queryState
    ? pending.findIndex((s) => statesEqual(s, queryState))
    : -1;
  if (matchIndex === -1) {
    return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=state-mismatch`, []);
  }
  // Consume exactly the matched state; leave any others pending so a second
  // tab's callback is not invalidated by this one completing.
  pending.splice(matchIndex, 1);

  try {
    const auth = getGoogleOAuthClient();
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) {
      return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=no-refresh-token`, pending);
    }
    auth.setCredentials(tokens);
    const scopeLevel = scopeLevelFromGrantedScopes(tokens.scope);

    const calendar = google.calendar({ version: "v3", auth });
    const primary = await calendar.calendarList.get({ calendarId: "primary" });
    const accountEmail = primary.data.id;
    if (!accountEmail) {
      return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=error`, pending);
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
        // INVARIANT: the stored `scopeLevel` always describes the refresh
        // token stored alongside it in the same write. This update branch
        // replaces `refreshTokenEncrypted` unconditionally, so `scopeLevel`
        // MUST be replaced unconditionally too — deriving it from the scope
        // Google actually granted. Suppressing the write to avoid a cosmetic
        // downgrade would leave a row claiming "readwrite" while holding a
        // readonly token; outbound sync selects on scopeLevel, so every push
        // would 403 insufficientPermissions, which is not a per-event error
        // and therefore deactivates the whole connection (killing inbound
        // sync too). A truthful downgrade degrades cleanly to inbound-only.
        //
        // The accidental downgrade is prevented at its source instead: every
        // entry point into /authorize carries the connection's existing level
        // as `?level=`, so a re-auth requests at least what the row already
        // has (see CalendarConnectionsList.tsx).
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

    return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=connected`, pending);
  } catch (error) {
    console.error(
      "[google-calendar-callback]",
      error instanceof Error ? error.message : String(error)
    );
    return redirectWithStates(`${appUrl}/profile?tab=calendar&calendar=error`, pending);
  }
}
