/**
 * Next.js Middleware
 * Handles authentication and multi-tenant routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantMiddleware, addTenantContextToHeaders } from '@/lib/middleware/tenant-middleware';
import { redisService } from '@/lib/cache/redis';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Run tenant middleware
  const { response, context } = await tenantMiddleware(req, pathname);

  // If middleware returned a response (e.g., redirect), return it
  if (response) {
    return response;
  }

  // Check authentication for protected routes
  const cookieHeader = req.headers.get('cookie') || '';
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/', '/setup', '/api/health', '/health'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!isPublicRoute && !sessionToken) {
    // Redirect to login if no session token
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Verify session token
  if (sessionToken && !isPublicRoute) {
    try {
      const session = await redisService.get(`session:${sessionToken}`);

      if (!session) {
        // Session expired or invalid
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      // On error, allow request to continue (API will handle auth)
    }
  }

  // Create response and add tenant context to headers
  const response = NextResponse.next();

  if (context) {
    addTenantContextToHeaders(response.headers, context);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
