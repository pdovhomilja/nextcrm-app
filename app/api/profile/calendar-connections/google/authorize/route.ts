import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getGoogleAuthUrl } from "@/lib/crm/calendar/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = req.nextUrl.searchParams.get("level") === "readwrite" ? "readwrite" : "readonly";
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getGoogleAuthUrl(state, level));
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/api/profile/calendar-connections/google",
  });
  return res;
}
