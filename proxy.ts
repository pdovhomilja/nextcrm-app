import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { isPreviewHostAllowed, isPreviewsBaseMalformed } from "./lib/homepage/preview-host";

const intlMiddleware = createMiddleware(routing);

// Admin-only API paths — cookie presence checked here, role checked server-side
const ADMIN_ONLY_PATHS = [
  "/api/user/activateAdmin",
  "/api/user/deactivateAdmin",
  "/api/user/activate",
  "/api/user/deactivate",
  "/api/user/inviteuser",
  "/api/admin",
];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Inngest webhook — pass through, Inngest handles its own auth via signing key
  if (path.startsWith("/api/inngest")) {
    return NextResponse.next();
  }

  // fork: public prospect homepage previews (/p/[slug]) — no auth, no intl; the slug is the capability.
  // When a dedicated previews host is configured (NEXT_PUBLIC_PREVIEWS_BASE_URL),
  // serve previews ONLY on that host so LLM-generated content can't also be reached
  // under the authenticated CRM domain. Unset (local dev) → allow everywhere so the
  // drawer's relative /p/ fallback works.
  if (path.startsWith("/p/")) {
    const previewsBase = process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
    if (isPreviewsBaseMalformed(previewsBase)) {
      // Fail-open on the convenience gate (never break previews), but surface it:
      // a malformed previews base means the isolation gate is silently disabled.
      console.warn("[PREVIEW_HOST_GATE] NEXT_PUBLIC_PREVIEWS_BASE_URL is malformed; /p/ host gate disabled");
    } else if (!isPreviewHostAllowed(req.headers.get("host"), previewsBase)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  // better-auth API routes — pass through to better-auth handler
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(req);

  // Admin-only routes — require session cookie (role checked server-side)
  if (ADMIN_ONLY_PATHS.some((p) => path.startsWith(p))) {
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Non-API routes — redirect to sign-in if no session cookie
  if (!path.startsWith("/api")) {
    if (!sessionCookie) {
      // Allow auth pages (sign-in, register, pending, inactive)
      const authPaths = ["/sign-in", "/register", "/pending", "/inactive"];
      const isAuthPage = authPaths.some((p) => path.includes(p));
      if (!isAuthPage) {
        return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
      }
    }
  }

  // Non-API routes — delegate to next-intl
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Admin-only API paths
    "/api/user/activateAdmin/:path*",
    "/api/user/deactivateAdmin/:path*",
    "/api/user/activate/:path*",
    "/api/user/deactivate/:path*",
    "/api/user/inviteuser",
    "/api/admin/:path*",
    // better-auth API
    "/api/auth/:path*",
    // All non-API routes (existing intl matcher)
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
