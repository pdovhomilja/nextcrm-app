import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { canvaRedirectUri } from "@/lib/canva/config";
import { canvaFetch, exchangeCanvaCode, persistCanvaTokens } from "@/lib/canva/client";

const COOKIE_PATH = "/api/canva";

function clearCookies(response: NextResponse) {
  const cleared = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: COOKIE_PATH,
  };
  for (const name of ["canva_oauth_state", "canva_oauth_verifier", "canva_oauth_return", "canva_oauth_origin"]) {
    response.cookies.set(name, "", cleared);
  }
}

export async function GET(request: NextRequest) {
  const origin =
    request.cookies.get("canva_oauth_origin")?.value?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.nextUrl.origin;
  const returnTo = request.cookies.get("canva_oauth_return")?.value || "/admin/canva";
  const dest = new URL(returnTo, origin);

  const fail = (reason: string) => {
    dest.searchParams.set("canva", "error");
    dest.searchParams.set("reason", reason);
    const response = NextResponse.redirect(dest);
    clearCookies(response);
    return response;
  };

  const url = request.nextUrl;
  if (url.searchParams.get("error")) return fail("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("canva_oauth_state")?.value;
  const verifier = request.cookies.get("canva_oauth_verifier")?.value;
  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return fail("state-mismatch");
  }

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.redirect(`${origin}/sign-in`);

  try {
    const tokens = await exchangeCanvaCode({
      code,
      codeVerifier: verifier,
      redirectUri: canvaRedirectUri(origin),
    });
    await persistCanvaTokens(session.user.id, tokens);
    try {
      const me = (await canvaFetch(session.user.id, "/users/me")) as {
        user?: { id?: string; display_name?: string };
      };
      if (me.user) {
        await persistCanvaTokens(session.user.id, tokens, {
          canvaUserId: me.user.id,
          displayName: me.user.display_name,
        });
      }
    } catch {
      // Profile scope may be missing; the connection is still usable.
    }
    dest.searchParams.set("canva", "connected");
    const response = NextResponse.redirect(dest);
    clearCookies(response);
    return response;
  } catch (error) {
    console.error("[canva/callback]", error);
    return fail("token-exchange");
  }
}
