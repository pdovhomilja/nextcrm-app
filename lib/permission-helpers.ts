/**
 * Permission Helper Utilities
 * Provides type-safe permission checking for API routes and server actions
 */

import { prismadb } from "@/lib/prisma";
import {
  hasPermission,
  canManageMembers,
  canManageRoles,
  canManageSettings,
  canRead,
  canWrite,
  canDelete,
  isAdmin,
} from "@/lib/permissions";
import type { OrganizationRole } from "@prisma/client";

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: OrganizationRole;
  actualRole?: OrganizationRole;
}

/**
 * Check if a user can read content
 */
export async function checkReadPermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canRead(role)) {
      return {
        allowed: false,
        reason: "Insufficient permissions for read operation",
        requiredRole: "VIEWER",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_READ_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can create/write content
 */
export async function checkWritePermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canWrite(role)) {
      return {
        allowed: false,
        reason: "Insufficient permissions for write operation",
        requiredRole: "MEMBER",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_WRITE_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can delete content (with optional ownership check)
 * @param userId - The user attempting the deletion
 * @param organizationId - The organization ID
 * @param resourceCreatedBy - ID of user who created the resource (for ownership check)
 * @param allowAdminOverride - Whether admins can delete resources they don't own
 */
export async function checkDeletePermission(
  userId: string,
  organizationId: string,
  resourceCreatedBy?: string,
  allowAdminOverride: boolean = true
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canDelete(role)) {
      return {
        allowed: false,
        reason: "Insufficient permissions for delete operation",
        requiredRole: "MEMBER",
        actualRole: role,
      };
    }

    // Ownership check: MEMBER can only delete their own resources
    if (
      resourceCreatedBy &&
      userId !== resourceCreatedBy &&
      allowAdminOverride &&
      !isAdmin(role)
    ) {
      return {
        allowed: false,
        reason: "You can only delete resources you created",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_DELETE_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can manage team members (invite, remove, change roles)
 */
export async function checkManageMembersPermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canManageMembers(role)) {
      return {
        allowed: false,
        reason: "Insufficient permissions to manage team members",
        requiredRole: "ADMIN",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_MANAGE_MEMBERS_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can manage roles (OWNER only)
 */
export async function checkManageRolesPermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canManageRoles(role)) {
      return {
        allowed: false,
        reason: "Only organization owners can manage roles",
        requiredRole: "OWNER",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_MANAGE_ROLES_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can manage organization settings
 */
export async function checkManageSettingsPermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (!canManageSettings(role)) {
      return {
        allowed: false,
        reason: "Insufficient permissions to manage organization settings",
        requiredRole: "ADMIN",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_MANAGE_SETTINGS_PERMISSION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can access billing (OWNER only)
 */
export async function checkBillingAccess(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (role !== "OWNER") {
      return {
        allowed: false,
        reason: "Only organization owners can access billing",
        requiredRole: "OWNER",
        actualRole: role,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_BILLING_ACCESS_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Check if a user can delete the organization (OWNER only)
 */
export async function checkDeleteOrganizationPermission(
  userId: string,
  organizationId: string
): Promise<PermissionCheckResult> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organization_role: true, organizationId: true, organization: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "User not in organization",
      };
    }

    const role = user.organization_role as OrganizationRole;

    if (role !== "OWNER") {
      return {
        allowed: false,
        reason: "Only organization owners can delete the organization",
        requiredRole: "OWNER",
        actualRole: role,
      };
    }

    // Verify user is the organization owner
    if (user.organization?.ownerId !== userId) {
      return {
        allowed: false,
        reason: "You must be the organization owner to delete it",
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CHECK_DELETE_ORGANIZATION_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking permissions",
    };
  }
}

/**
 * Verify user is in organization and get their role
 */
export async function getUserOrgRole(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  try {
    const user = await prismadb.users.findUnique({
      where: { id: userId },
      select: { organizationId: true, organization_role: true },
    });

    if (!user || user.organizationId !== organizationId) {
      return null;
    }

    return user.organization_role as OrganizationRole;
  } catch (error) {
    console.error("[GET_USER_ORG_ROLE_ERROR]", error);
    return null;
  }
}

/**
 * Check if a user can modify a specific resource
 * Considers both ownership and role
 */
export async function canModifyResource(
  userId: string,
  organizationId: string,
  resourceId: string,
  resourceModel: "crm_Accounts" | "crm_Leads" | "crm_Contacts" | "crm_Opportunities" | "boards" | "sections" | "tasks",
  operation: "update" | "delete"
): Promise<PermissionCheckResult> {
  try {
    // First check basic permissions
    const permissionCheck =
      operation === "delete"
        ? await checkDeletePermission(userId, organizationId)
        : await checkWritePermission(userId, organizationId);

    if (!permissionCheck.allowed) {
      return permissionCheck;
    }

    // Get the resource
    const resource = await (prismadb[resourceModel] as any).findUnique({
      where: { id: resourceId },
      select: {
        organizationId: true,
        createdBy: true,
      },
    });

    if (!resource) {
      return {
        allowed: false,
        reason: "Resource not found",
      };
    }

    // Verify organization match
    if (resource.organizationId !== organizationId) {
      return {
        allowed: false,
        reason: "Resource does not belong to your organization",
      };
    }

    // Check ownership for MEMBER role
    const userRole = await getUserOrgRole(userId, organizationId);

    if (userRole === "MEMBER" && resource.createdBy !== userId) {
      return {
        allowed: false,
        reason:
          operation === "delete"
            ? "You can only delete resources you created"
            : "You can only modify resources you created",
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[CAN_MODIFY_RESOURCE_ERROR]", error);
    return {
      allowed: false,
      reason: "Error checking resource permissions",
    };
  }
}

/**
 * Create a standard permission denied response
 */
export function createPermissionDeniedResponse(result: PermissionCheckResult) {
  return {
    error: "Forbidden",
    message: result.reason || "Insufficient permissions",
    code: "INSUFFICIENT_PERMISSIONS",
    requiredRole: result.requiredRole,
    actualRole: result.actualRole,
  };
}
