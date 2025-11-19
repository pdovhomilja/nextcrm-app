/**
 * Permission checking middleware utilities
 * These utilities help enforce permissions at both route and component level
 */

import { OrganizationRole } from "@prisma/client";
import { Permission, hasPermission } from "@/lib/permissions";

/**
 * Higher-order function to create a permission checking middleware
 * Returns a function that checks if a user has the required permission
 * Usage:
 * const checkManagePermission = requirePermission(PERMISSIONS.MANAGE_MEMBERS);
 * if (!checkManagePermission(userRole)) { return error }
 */
export function requirePermission(requiredPermission: Permission) {
  return (userRole: OrganizationRole | null | undefined): boolean => {
    if (!userRole) return false;
    return hasPermission(userRole, requiredPermission);
  };
}

/**
 * Check if a user has any of the specified permissions
 */
export function requireAnyPermission(
  permissions: Permission[]
): (userRole: OrganizationRole | null | undefined) => boolean {
  return (userRole: OrganizationRole | null | undefined): boolean => {
    if (!userRole) return false;
    return permissions.some((perm) => hasPermission(userRole, perm));
  };
}

/**
 * Check if user has a specific role
 */
export function requireRole(requiredRole: OrganizationRole) {
  return (userRole: OrganizationRole | null | undefined): boolean => {
    return userRole === requiredRole;
  };
}

/**
 * Check if user has any of the specified roles
 */
export function requireAnyRole(requiredRoles: OrganizationRole[]) {
  return (userRole: OrganizationRole | null | undefined): boolean => {
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
  };
}

/**
 * Check if user is owner
 */
export function isOwnerOnly(userRole: OrganizationRole | null | undefined): boolean {
  return userRole === "OWNER";
}

/**
 * Check if user is owner or admin
 */
export function isOwnerOrAdmin(
  userRole: OrganizationRole | null | undefined
): boolean {
  return userRole === "OWNER" || userRole === "ADMIN";
}
