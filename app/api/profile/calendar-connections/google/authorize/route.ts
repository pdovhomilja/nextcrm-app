import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getGoogleAuthUrl } from "@/lib/crm/calendar/google";
import {
  MAX_PENDING_STATES,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  parsePendingStates,
  serializePendingStates,
} from "@/lib/crm/calendar/oauth-state";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = req.nextUrl.searchParams.get("level") === "readwrite" ? "readwrite" : "readonly";
  const state = randomBytes(16).toString("hex");

  // Append to the pending-states list rather than overwriting it, so two
  // connect tabs opened concurrently each keep a valid state for their own
  // callback. Oldest states are dropped first when the cap is reached.
  const pending = parsePendingStates(req.cookies.get(STATE_COOKIE)?.value);
  pending.push(state);
  if (pending.length > MAX_PENDING_STATES) {
    pending.splice(0, pending.length - MAX_PENDING_STATES);
  }

  const res = NextResponse.redirect(getGoogleAuthUrl(state, level));
  res.cookies.set(STATE_COOKIE, serializePendingStates(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: STATE_COOKIE_PATH,
  });
  return res;
}
