// lib/crm/calendar/oauth-state.ts
// OAuth state handling for the Google Calendar connect flow.
//
// Two hardening properties live here:
//
// 1. Constant-time comparison. The state is the CSRF token of the connect flow,
//    so it must never be compared with a plain `!==` — that leaks match
//    position through timing.
//
// 2. A multi-state cookie. /authorize used to overwrite the single
//    `gcal_oauth_state` cookie, so opening two connect tabs in a row made the
//    first tab's callback fail with a state mismatch. The cookie now holds a
//    JSON array of pending states; each /authorize appends, each callback
//    removes exactly the state it consumed, so concurrent tabs complete
//    independently. The cookie is capped at MAX_PENDING_STATES entries.
import { timingSafeEqual } from "crypto";

export const STATE_COOKIE = "gcal_oauth_state";
export const STATE_COOKIE_PATH = "/api/profile/calendar-connections/google";
export const MAX_PENDING_STATES = 8;

export function statesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Legacy cookies held a single bare hex state. A plain string therefore parses
// to a one-element list so in-flight connects started before the multi-state
// deploy still complete. A JSON array is the current format.
export function parsePendingStates(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
  } catch {
    // Not JSON — fall through to the legacy single-state interpretation.
  }
  return [raw];
}

export function serializePendingStates(states: string[]): string {
  return JSON.stringify(states);
}
