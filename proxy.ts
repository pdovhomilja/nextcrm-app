import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPartnerAllowedPath } from "@/lib/partner-routes";

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

  // better-auth API routes — pass through to better-auth handler
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(req);

  // Partners get only the routes in lib/partner-routes.ts, refused here on the
  // server for pages and API alike (deny by default). The session is looked up
  // only off the allow-list, so partner pages and cookie-less calls cost nothing.
  if (sessionCookie && !isPartnerAllowedPath(path)) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session?.user.role === "partner") {
      if (path.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

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

  // Other API routes authenticate themselves
  if (path.startsWith("/api")) {
    return NextResponse.next();
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
    // Every other API route, for the partner allow-list
    "/api/:path*",
    // better-auth API
    "/api/auth/:path*",
    // All non-API routes (existing intl matcher)
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
