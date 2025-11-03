"use client";

import { useCallback } from "react";
import { OrganizationRole } from "@prisma/client";
import {
  getRoleDisplayName,
  getRoleDescription,
  ASSIGNABLE_ROLES,
  ALL_ROLES,
} from "@/lib/permissions";

/**
 * Hook to get and manage user role information
 * Usage: const { displayName, description } = useRole(userRole);
 */
export function useRole(userRole: OrganizationRole | null | undefined) {
  const getDisplayName = useCallback(
    (): string => (userRole ? getRoleDisplayName(userRole) : "Unknown"),
    [userRole]
  );

  const getDescription = useCallback(
    (): string => (userRole ? getRoleDescription(userRole) : ""),
    [userRole]
  );

  const isOwner = useCallback((): boolean => userRole === "OWNER", [userRole]);

  const isAdmin = useCallback((): boolean => userRole === "ADMIN", [userRole]);

  const isMember = useCallback((): boolean => userRole === "MEMBER", [userRole]);

  const isViewer = useCallback((): boolean => userRole === "VIEWER", [userRole]);

  return {
    role: userRole,
    displayName: getDisplayName(),
    description: getDescription(),
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    assignableRoles: ASSIGNABLE_ROLES,
    allRoles: ALL_ROLES,
  };
}
