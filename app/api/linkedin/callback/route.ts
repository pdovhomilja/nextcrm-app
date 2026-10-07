import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  exchangeLinkedInAuthorizationCode,
  hasDirectLinkedInOAuth,
  persistLinkedInTokens,
  resolveLinkedInOriginFromRequest,
} from "@/lib/linkedin-oauth";

const STATE_COOKIE = "linkedin_oauth_state";
const ORIGIN_COOKIE = "linkedin_oauth_origin";
const COOKIE_PATH = "/api/linkedin";

function clearOAuthCookies(response: NextResponse) {
  const cleared = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: COOKIE_PATH,
  };
  response.cookies.set(STATE_COOKIE, "", cleared);
  response.cookies.set(ORIGIN_COOKIE, "", cleared);
}

function redirectAdmin(origin: string, params: Record<string, string>) {
  const url = new URL("/en/admin/linkedin", origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  clearOAuthCookies(response);
  return response;
}

function failureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown";
  if (message.includes("EMAIL_ENCRYPTION_KEY")) return "missing-encryption-key";
  if (message.includes("LinkedInConnection") || message.includes("does not exist")) {
    return "database-migration";
  }
  if (message.includes("LinkedIn token exchange failed")) {
    return `token-exchange:${encodeURIComponent(message.slice(0, 120))}`;
  }
  return "token-exchange";
}

export async function GET(request: NextRequest) {
  const requestOrigin = resolveLinkedInOriginFromRequest(request);
  const origin =
    request.cookies.get(ORIGIN_COOKIE)?.value?.replace(/\/$/, "") ?? requestOrigin;
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
      console.error("[linkedin/callback] OAuth failed:", error);
      return redirectAdmin(origin, {
        connected: "error",
        reason: failureReason(error),
      });
    }
  }

  if (code) {
    return redirectAdmin(origin, { connected: "error", reason: "missing-linkedin-env" });
  }

  return redirectAdmin(origin, { connected: "1" });
}
