"use client";

import React from "react";
import { OrganizationRole } from "@prisma/client";
import { hasPermission, Permission } from "@/lib/permissions";

interface PermissionGateProps {
  permission: Permission;
  userRole: OrganizationRole | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * Usage:
 * <PermissionGate permission={PERMISSIONS.MANAGE_MEMBERS} userRole={userRole}>
 *   <button>Invite Member</button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  userRole,
  children,
  fallback,
}: PermissionGateProps) {
  if (!userRole || !hasPermission(userRole, permission)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface RoleCheckProps {
  role: OrganizationRole;
  userRole: OrganizationRole | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders based on exact role match
 * Usage:
 * <RoleCheck role="OWNER" userRole={userRole}>
 *   <button>Owner Only</button>
 * </RoleCheck>
 */
export function RoleCheck({
  role,
  userRole,
  children,
  fallback,
}: RoleCheckProps) {
  if (userRole !== role) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface AnyRoleCheckProps {
  roles: OrganizationRole[];
  userRole: OrganizationRole | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders if user has any of the specified roles
 * Usage:
 * <AnyRoleCheck roles={["OWNER", "ADMIN"]} userRole={userRole}>
 *   <button>Admins Only</button>
 * </AnyRoleCheck>
 */
export function AnyRoleCheck({
  roles,
  userRole,
  children,
  fallback,
}: AnyRoleCheckProps) {
  if (!userRole || !roles.includes(userRole)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
