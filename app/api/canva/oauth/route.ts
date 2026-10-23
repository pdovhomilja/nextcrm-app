import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  CANVA_AUTHORIZE_URL,
  CANVA_SCOPES,
  canvaClientId,
  canvaRedirectUri,
  hasCanvaOAuth,
} from "@/lib/canva/config";
import { codeChallengeS256, createCodeVerifier } from "@/lib/canva/pkce";

const COOKIE_PATH = "/api/canva";

function originOf(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const origin = originOf(request);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }
  if (!hasCanvaOAuth()) {
    return NextResponse.redirect(`${origin}/en/admin/canva?connected=error&reason=missing-env`);
  }

  const returnTo = request.nextUrl.searchParams.get("return") || "/admin/canva";
  const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/admin/canva";
  const state = crypto.randomUUID();
  const verifier = createCodeVerifier();
  const challenge = codeChallengeS256(verifier);

  const authorize = new URL(CANVA_AUTHORIZE_URL);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "s256");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", canvaClientId());
  authorize.searchParams.set("redirect_uri", canvaRedirectUri(origin));
  authorize.searchParams.set("scope", CANVA_SCOPES);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: COOKIE_PATH,
  };
  response.cookies.set("canva_oauth_state", state, cookie);
  response.cookies.set("canva_oauth_verifier", verifier, cookie);
  response.cookies.set("canva_oauth_return", safeReturn, cookie);
  response.cookies.set("canva_oauth_origin", origin, cookie);
  return response;
}
