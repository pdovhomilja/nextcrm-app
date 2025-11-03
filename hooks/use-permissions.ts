"use client";

import { useCallback } from "react";
import { OrganizationRole } from "@prisma/client";
import {
  hasPermission,
  canManageMembers,
  canManageRoles,
  canManageSettings,
  canRead,
  canWrite,
  canDelete,
  isAdmin,
  Permission,
} from "@/lib/permissions";

/**
 * Hook to check user permissions based on their organization role
 * Usage: const { hasPermission: userHasPermission } = usePermissions(userRole);
 */
export function usePermissions(userRole: OrganizationRole | null | undefined) {
  const checkPermission = useCallback(
    (permission: Permission): boolean => {
      if (!userRole) return false;
      return hasPermission(userRole, permission);
    },
    [userRole]
  );

  return {
    hasPermission: checkPermission,
    canManageMembers: useCallback(
      () => (userRole ? canManageMembers(userRole) : false),
      [userRole]
    ),
    canManageRoles: useCallback(
      () => (userRole ? canManageRoles(userRole) : false),
      [userRole]
    ),
    canManageSettings: useCallback(
      () => (userRole ? canManageSettings(userRole) : false),
      [userRole]
    ),
    canRead: useCallback(() => (userRole ? canRead(userRole) : false), [userRole]),
    canWrite: useCallback(
      () => (userRole ? canWrite(userRole) : false),
      [userRole]
    ),
    canDelete: useCallback(
      () => (userRole ? canDelete(userRole) : false),
      [userRole]
    ),
    isAdmin: useCallback(() => (userRole ? isAdmin(userRole) : false), [userRole]),
  };
}
