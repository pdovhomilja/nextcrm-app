import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  buildLinkedInAuthorizeUrl,
  hasDirectLinkedInOAuth,
} from "@/lib/linkedin-oauth";
import { getLinkedInAppOrigin } from "@/lib/linkedin-connect";

const STATE_COOKIE = "linkedin_oauth_state";
const COOKIE_PATH = "/api/linkedin";

export async function GET() {
  const session = await getSession();
  const origin = await getLinkedInAppOrigin();
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/en/admin/linkedin?connected=error&reason=${reason}`);

  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  if (!hasDirectLinkedInOAuth()) {
    return fail("missing-linkedin-env");
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildLinkedInAuthorizeUrl(origin, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: COOKIE_PATH,
  });
  return response;
}
