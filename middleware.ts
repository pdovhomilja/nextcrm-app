import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow auth pages, API routes, static files, and root
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Multi-tenancy: Extract company ID from URL pattern /{cid}/...
  const segments = pathname.split("/").filter(Boolean)
  const companyId = segments[0]

  // If route doesn't follow /{cid}/... pattern, redirect to home
  if (!companyId || segments.length < 2) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Company ID validation will be handled by server components/actions
  // using the session data and database queries
  
  // Add company ID to request headers for server components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-company-id", companyId)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}