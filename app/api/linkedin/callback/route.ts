import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  exchangeLinkedInAuthorizationCode,
  hasDirectLinkedInOAuth,
  persistLinkedInTokens,
} from "@/lib/linkedin-oauth";
import { getLinkedInAppOrigin } from "@/lib/linkedin-connect";

const STATE_COOKIE = "linkedin_oauth_state";
const COOKIE_PATH = "/api/linkedin";

function redirectAdmin(origin: string, params: Record<string, string>) {
  const url = new URL("/en/admin/linkedin", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: COOKIE_PATH,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const origin = await getLinkedInAppOrigin();
  const url = new URL(request.url);

  if (url.searchParams.has("error")) {
    return redirectAdmin(origin, { connected: "error", reason: "linkedin-denied" });
  }

  const code = url.searchParams.get("code");

  if (code && hasDirectLinkedInOAuth()) {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.redirect(`${origin}/sign-in`);
    }

    const cookieState = request.cookies.get(STATE_COOKIE)?.value;
    const queryState = url.searchParams.get("state");
    if (!cookieState || !queryState || cookieState !== queryState) {
      return redirectAdmin(origin, { connected: "error", reason: "state-mismatch" });
    }

    try {
      const tokens = await exchangeLinkedInAuthorizationCode(code, origin);
      await persistLinkedInTokens(session.user.id, tokens);
      return redirectAdmin(origin, { connected: "1" });
    } catch (error) {
      console.error("[linkedin/callback] Token exchange failed:", error);
      return redirectAdmin(origin, { connected: "error", reason: "token-exchange" });
    }
  }

  if (code) {
    return redirectAdmin(origin, { connected: "error", reason: "missing-linkedin-env" });
  }

  return redirectAdmin(origin, { connected: "1" });
}
