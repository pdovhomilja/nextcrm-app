import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  buildLinkedInAuthorizeUrl,
  hasDirectLinkedInOAuth,
  resolveLinkedInOriginFromRequest,
} from "@/lib/linkedin-oauth";

const STATE_COOKIE = "linkedin_oauth_state";
const ORIGIN_COOKIE = "linkedin_oauth_origin";
const COOKIE_PATH = "/api/linkedin";

export async function GET(request: NextRequest) {
  const origin = resolveLinkedInOriginFromRequest(request);
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/en/admin/linkedin?connected=error&reason=${reason}`);

  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  if (!hasDirectLinkedInOAuth()) {
    return fail("missing-linkedin-env");
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildLinkedInAuthorizeUrl(origin, state));
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: COOKIE_PATH,
  };
  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  response.cookies.set(ORIGIN_COOKIE, origin, cookieOptions);
  return response;
}
