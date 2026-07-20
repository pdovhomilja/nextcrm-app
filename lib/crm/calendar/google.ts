import { google, calendar_v3 } from "googleapis";
import { decrypt } from "@/lib/email-crypto";

// `google-auth-library` is a transitive dependency of `googleapis` (not a
// direct package.json dependency), and under pnpm's strict node_modules
// layout its types are not directly importable — and two disjoint copies
// (10.5.0 / 10.9.0) can be present transitively, so an `OAuth2Client` type
// imported from one is not assignable to the other. Deriving the type from
// `google.auth.OAuth2` itself sidesteps both problems.
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const SCOPE_READONLY = "https://www.googleapis.com/auth/calendar.readonly";
const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events";

export type CalendarScopeLevel = "readonly" | "readwrite";

export function getGoogleOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/profile/calendar-connections/google/callback`
  );
}

// Derived from what Google actually granted (tokens.scope, space-delimited),
// never from what we requested.
export function scopeLevelFromGrantedScopes(
  scope: string | null | undefined
): CalendarScopeLevel {
  return scope?.split(" ").includes(SCOPE_EVENTS) ? "readwrite" : "readonly";
}

// Fields to merge into an EXISTING connection's row on re-auth.
//
// The plain "Connect Google Calendar" button links to /authorize with no
// `level`, so it always requests readonly. Writing the granted level
// unconditionally would silently downgrade a rep who had already enabled
// two-way sync — outbound would just stop, with the profile label flipping to
// "Inbound only" as the only signal. A re-auth may therefore only ever UPGRADE
// the stored scope level, never downgrade it; dropping to readonly is an
// explicit action (Disconnect), not an accident of which button was clicked.
// Returning `{}` for a readonly grant leaves the stored value untouched, which
// also covers someone hitting the /authorize URL directly.
export function scopeLevelUpsertFields(
  grantedLevel: CalendarScopeLevel
): { scopeLevel: CalendarScopeLevel } | Record<string, never> {
  return grantedLevel === "readwrite" ? { scopeLevel: grantedLevel } : {};
}

export function getGoogleAuthUrl(
  state: string,
  level: CalendarScopeLevel = "readonly"
): string {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: level === "readwrite" ? [SCOPE_READONLY, SCOPE_EVENTS] : [SCOPE_READONLY],
    state,
  });
}

export function getCalendarClientForConnection(connection: {
  refreshTokenEncrypted: string;
}): calendar_v3.Calendar {
  const auth = getGoogleOAuthClient();
  auth.setCredentials({ refresh_token: decrypt(connection.refreshTokenEncrypted) });
  return google.calendar({ version: "v3", auth });
}
