/**
 * Permission and role management system for NextCRM
 * Defines permissions for different organizational roles
 */

import { OrganizationRole } from "@prisma/client";

// Permission constants
export const PERMISSIONS = {
  // Read operations
  READ: "READ",
  // Write/Create operations
  WRITE: "WRITE",
  // Delete operations
  DELETE: "DELETE",
  // Administrative operations
  ADMIN: "ADMIN",
  // Team member management
  MANAGE_MEMBERS: "MANAGE_MEMBERS",
  // Role modification
  MANAGE_ROLES: "MANAGE_ROLES",
  // Organization settings
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role to permissions mapping
 * Defines what permissions each role has
 */
export const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  OWNER: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE,
    PERMISSIONS.DELETE,
    PERMISSIONS.ADMIN,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  ADMIN: [
    PERMISSIONS.READ,
    PERMISSIONS.WRITE,
    PERMISSIONS.DELETE,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  MEMBER: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE],
  VIEWER: [PERMISSIONS.READ],
};

/**
 * Check if a role has a specific permission
 * @param role - The organization role
 * @param permission - The permission to check
 * @returns true if the role has the permission
 */
export function hasPermission(
  role: OrganizationRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can manage team members
 * @param role - The organization role
 * @returns true if the role can manage members
 */
export function canManageMembers(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.MANAGE_MEMBERS);
}

/**
 * Check if a role can manage roles
 * @param role - The organization role
 * @returns true if the role can manage roles (only owner)
 */
export function canManageRoles(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.MANAGE_ROLES);
}

/**
 * Check if a role can manage organization settings
 * @param role - The organization role
 * @returns true if the role can manage settings
 */
export function canManageSettings(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.MANAGE_SETTINGS);
}

/**
 * Check if a role can read content
 * @param role - The organization role
 * @returns true if the role can read
 */
export function canRead(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.READ);
}

/**
 * Check if a role can create/write content
 * @param role - The organization role
 * @returns true if the role can write
 */
export function canWrite(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.WRITE);
}

/**
 * Check if a role can delete content
 * @param role - The organization role
 * @returns true if the role can delete
 */
export function canDelete(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.DELETE);
}

/**
 * Check if a role has admin privileges
 * @param role - The organization role
 * @returns true if the role has admin privileges
 */
export function isAdmin(role: OrganizationRole): boolean {
  return hasPermission(role, PERMISSIONS.ADMIN);
}

/**
 * Get a human-readable role name
 * @param role - The organization role
 * @returns The role name
 */
export function getRoleDisplayName(role: OrganizationRole): string {
  const names: Record<OrganizationRole, string> = {
    OWNER: "Owner",
    ADMIN: "Administrator",
    MEMBER: "Member",
    VIEWER: "Viewer",
  };
  return names[role] ?? role;
}

/**
 * Get a human-readable role description
 * @param role - The organization role
 * @returns The role description
 */
export function getRoleDescription(role: OrganizationRole): string {
  const descriptions: Record<OrganizationRole, string> = {
    OWNER: "Full access to all features and organization settings",
    ADMIN: "Can manage team members and organization settings",
    MEMBER: "Can create, read, and update content",
    VIEWER: "Read-only access to organization content",
  };
  return descriptions[role] ?? "";
}

/**
 * All available roles in the system
 */
export const ALL_ROLES: OrganizationRole[] = [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

/**
 * Roles that can be assigned to new members (exclude OWNER)
 */
export const ASSIGNABLE_ROLES: OrganizationRole[] = ["ADMIN", "MEMBER", "VIEWER"];
