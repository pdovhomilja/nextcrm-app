/**
 * Audit Logger Utility
 * Provides comprehensive audit logging for security and compliance
 */

import { prismadb } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

export interface AuditContext {
  userId?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogData {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  context: AuditContext;
}

/**
 * Log an audit event
 * @param data - Audit log data including action, resource, and context
 * @returns Promise<void>
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    await prismadb.auditLog.create({
      data: {
        organizationId: data.context.organizationId,
        userId: data.context.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        changes: data.changes || null,
        ipAddress: data.context.ipAddress || null,
        userAgent: data.context.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Do not throw - audit logging should not break the main flow
  }
}

/**
 * Log a CREATE action
 */
export async function logCreate(
  resource: string,
  resourceId: string,
  data: Record<string, any>,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "CREATE",
    resource,
    resourceId,
    changes: { created: data },
    context,
  });
}

/**
 * Log an UPDATE action
 */
export async function logUpdate(
  resource: string,
  resourceId: string,
  changes: { before: Record<string, any>; after: Record<string, any> },
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "UPDATE",
    resource,
    resourceId,
    changes,
    context,
  });
}

/**
 * Log a DELETE action
 */
export async function logDelete(
  resource: string,
  resourceId: string,
  data: Record<string, any>,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "DELETE",
    resource,
    resourceId,
    changes: { deleted: data },
    context,
  });
}

/**
 * Log an EXPORT action
 */
export async function logExport(
  resource: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "EXPORT",
    resource,
    context,
  });
}

/**
 * Log a LOGIN action
 */
export async function logLogin(
  userId: string,
  organizationId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action: "LOGIN",
    resource: "user",
    resourceId: userId,
    context: {
      userId,
      organizationId,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Log a LOGOUT action
 */
export async function logLogout(
  userId: string,
  organizationId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action: "LOGOUT",
    resource: "user",
    resourceId: userId,
    context: {
      userId,
      organizationId,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Log an INVITE action
 */
export async function logInvite(
  email: string,
  role: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "INVITE",
    resource: "organization_invitation",
    changes: { email, role },
    context,
  });
}

/**
 * Log a REMOVE action (user removal)
 */
export async function logRemove(
  userId: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "REMOVE",
    resource: "organization_member",
    resourceId: userId,
    context,
  });
}

/**
 * Log a ROLE_CHANGE action
 */
export async function logRoleChange(
  userId: string,
  oldRole: string,
  newRole: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "ROLE_CHANGE",
    resource: "organization_member",
    resourceId: userId,
    changes: { oldRole, newRole },
    context,
  });
}

/**
 * Log a SETTINGS_CHANGE action
 */
export async function logSettingsChange(
  settingKey: string,
  oldValue: any,
  newValue: any,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "SETTINGS_CHANGE",
    resource: "organization_settings",
    changes: { setting: settingKey, oldValue, newValue },
    context,
  });
}

/**
 * Log a SUBSCRIPTION_CHANGE action
 */
export async function logSubscriptionChange(
  oldPlan: string,
  newPlan: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "SUBSCRIPTION_CHANGE",
    resource: "subscription",
    changes: { oldPlan, newPlan },
    context,
  });
}

/**
 * Log a PAYMENT action
 */
export async function logPayment(
  amount: number,
  currency: string,
  status: string,
  context: AuditContext
): Promise<void> {
  await logAuditEvent({
    action: "PAYMENT",
    resource: "payment",
    changes: { amount, currency, status },
    context,
  });
}

/**
 * Get IP address from request headers
 */
export function getIpFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    undefined
  );
}

/**
 * Get user agent from request headers
 */
export function getUserAgentFromHeaders(headers: Headers): string | undefined {
  return headers.get("user-agent") || undefined;
}

/**
 * Extract audit context from request
 */
export function extractAuditContext(
  headers: Headers,
  organizationId: string,
  userId?: string
): AuditContext {
  return {
    organizationId,
    userId,
    ipAddress: getIpFromHeaders(headers),
    userAgent: getUserAgentFromHeaders(headers),
  };
}
