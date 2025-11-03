/**
 * Enhanced Permission Middleware
 * Provides role-based access control for API routes
 * Logs all permission denied events for security audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { hasPermission, PERMISSIONS, getRoleDisplayName, Permission } from "@/lib/permissions";
import type { OrganizationRole } from "@prisma/client";

/**
 * Permission denial event structure for audit logging
 */
interface PermissionDenialEvent {
  action: "PERMISSION_DENIED" | "UNAUTHORIZED" | "FORBIDDEN";
  userId?: string;
  organizationId?: string;
  resource: string;
  method: string;
  requiredRole?: OrganizationRole;
  actualRole?: OrganizationRole;
  requiredPermission?: Permission;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

/**
 * Log permission denial events for security monitoring
 */
async function logPermissionDenial(event: PermissionDenialEvent) {
  try {
    if (event.organizationId && event.userId) {
      await prismadb.auditLog.create({
        data: {
          organizationId: event.organizationId,
          userId: event.userId,
          action: "PERMISSION_DENIED",
          resource: "api_endpoint",
          resourceId: event.resource,
          changes: {
            method: event.method,
            requiredRole: event.requiredRole,
            actualRole: event.actualRole,
            requiredPermission: event.requiredPermission,
            ip: event.ip,
            severity: "warning",
            timestamp: event.timestamp.toISOString(),
          },
          ipAddress: event.ip || null,
          userAgent: event.userAgent || null,
        },
      });
    }
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
    // Don't throw - logging failure shouldn't block the response
  }
}

/**
 * Extract client IP from request
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Higher-order function to create permission-checking middleware
 * @param requiredPermission - Permission needed to access the route
 * @param requiredRole - Minimum role required (optional - auto-derived from permission)
 * @returns Middleware function
 *
 * @example
 * export const middleware = requirePermission(PERMISSIONS.WRITE);
 * export const config = { matcher: ["/api/crm/account"] };
 */
export function requirePermission(
  requiredPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  requiredRole?: OrganizationRole
) {
  return async (req: NextRequest) => {
    try {
      // Get session
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        const denialEvent: PermissionDenialEvent = {
          action: "UNAUTHORIZED",
          resource: req.nextUrl.pathname,
          method: req.method,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      // Fetch user with organization details
      const user = await prismadb.users.findUnique({
        where: { email: session.user.email },
        include: { organization: true },
      });

      if (!user) {
        const denialEvent: PermissionDenialEvent = {
          action: "UNAUTHORIZED",
          userId: session.user.id,
          resource: req.nextUrl.pathname,
          method: req.method,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "User not found",
            code: "USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (!user.organizationId) {
        const denialEvent: PermissionDenialEvent = {
          action: "FORBIDDEN",
          userId: user.id,
          resource: req.nextUrl.pathname,
          method: req.method,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "Forbidden",
            message: "User does not belong to an organization",
            code: "NO_ORGANIZATION",
          },
          { status: 403 }
        );
      }

      // Check permission
      const userRole = user.organization_role as OrganizationRole;

      if (!userRole || !hasPermission(userRole, requiredPermission)) {
        const denialEvent: PermissionDenialEvent = {
          action: "FORBIDDEN",
          userId: user.id,
          organizationId: user.organizationId,
          resource: req.nextUrl.pathname,
          method: req.method,
          requiredRole: requiredRole || userRole,
          actualRole: userRole,
          requiredPermission: requiredPermission,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "Forbidden",
            message: `This action requires ${requiredPermission} permission`,
            code: "INSUFFICIENT_PERMISSIONS",
            requiredPermission,
            actualRole: getRoleDisplayName(userRole),
          },
          { status: 403 }
        );
      }

      // Pass user info to route handler via headers
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-organization-id", user.organizationId);
      requestHeaders.set("x-user-role", userRole);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("[PERMISSION_MIDDLEWARE_ERROR]", error);

      return NextResponse.json(
        {
          error: "Internal Server Error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for owner-only operations
 * @example
 * export const middleware = requireOwnerRole();
 */
export function requireOwnerRole() {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      const user = await prismadb.users.findUnique({
        where: { email: session.user.email },
        include: { organization: true },
      });

      if (!user || !user.organizationId) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "User does not belong to an organization",
            code: "NO_ORGANIZATION",
          },
          { status: 403 }
        );
      }

      if (user.organization_role !== "OWNER") {
        const denialEvent: PermissionDenialEvent = {
          action: "FORBIDDEN",
          userId: user.id,
          organizationId: user.organizationId,
          resource: req.nextUrl.pathname,
          method: req.method,
          requiredRole: "OWNER",
          actualRole: user.organization_role as OrganizationRole,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "Forbidden",
            message: "This action is only available to organization owners",
            code: "OWNER_ONLY",
            requiredRole: "OWNER",
          },
          { status: 403 }
        );
      }

      // Pass user info to route handler
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-organization-id", user.organizationId);
      requestHeaders.set("x-user-role", user.organization_role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("[OWNER_MIDDLEWARE_ERROR]", error);

      return NextResponse.json(
        {
          error: "Internal Server Error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for admin-only operations (ADMIN and OWNER)
 * @example
 * export const middleware = requireAdminRole();
 */
export function requireAdminRole() {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      const user = await prismadb.users.findUnique({
        where: { email: session.user.email },
        include: { organization: true },
      });

      if (!user || !user.organizationId) {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "User does not belong to an organization",
            code: "NO_ORGANIZATION",
          },
          { status: 403 }
        );
      }

      const userRole = user.organization_role as OrganizationRole;
      const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";

      if (!isAdminOrOwner) {
        const denialEvent: PermissionDenialEvent = {
          action: "FORBIDDEN",
          userId: user.id,
          organizationId: user.organizationId,
          resource: req.nextUrl.pathname,
          method: req.method,
          requiredRole: "ADMIN",
          actualRole: userRole,
          timestamp: new Date(),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent") || undefined,
        };

        await logPermissionDenial(denialEvent);

        return NextResponse.json(
          {
            error: "Forbidden",
            message: "This action requires administrator privileges",
            code: "ADMIN_ONLY",
            requiredRole: "ADMIN",
          },
          { status: 403 }
        );
      }

      // Pass user info to route handler
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-organization-id", user.organizationId);
      requestHeaders.set("x-user-role", userRole);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("[ADMIN_MIDDLEWARE_ERROR]", error);

      return NextResponse.json(
        {
          error: "Internal Server Error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  };
}
