import { checkQuota, type QuotaCheckResult } from "@/actions/usage/check-quota";

/**
 * Quota enforcement utilities for hard quota checks
 * These functions should be called before creating resources
 */

export async function canCreateUser(organizationId: string): Promise<QuotaCheckResult> {
  return checkQuota("users", organizationId, 1);
}

export async function canCreateContact(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("contacts", organizationId, count);
}

export async function canCreateLead(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("leads", organizationId, count);
}

export async function canCreateAccount(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("accounts", organizationId, count);
}

export async function canCreateOpportunity(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("opportunities", organizationId, count);
}

export async function canUploadFile(
  organizationId: string,
  fileSizeBytes: number
): Promise<QuotaCheckResult> {
  return checkQuota("storage", organizationId, fileSizeBytes);
}

export async function canCreateProject(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("projects", organizationId, count);
}

export async function canCreateDocument(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("documents", organizationId, count);
}

export async function canCreateTask(
  organizationId: string,
  count: number = 1
): Promise<QuotaCheckResult> {
  return checkQuota("tasks", organizationId, count);
}

/**
 * Helper function to format quota error messages
 */
export function formatQuotaError(result: QuotaCheckResult, resourceName: string): string {
  if (result.unlimited) {
    return "";
  }

  if (!result.allowed) {
    return `You have reached your ${resourceName} limit (${result.used}/${result.limit}). Please upgrade your plan.`;
  }

  if (result.percentage && result.percentage >= 80) {
    return `Warning: You are using ${Math.round(result.percentage)}% of your ${resourceName} limit (${result.used}/${result.limit}).`;
  }

  return "";
}

/**
 * Check if a resource is at critical usage (90%+ or exceeded)
 */
export function isResourceAtCritical(result: QuotaCheckResult): boolean {
  return !result.allowed || (result.percentage ? result.percentage >= 90 : false);
}

/**
 * Check if a resource is approaching limit (80-90%)
 */
export function isResourceApproaching(result: QuotaCheckResult): boolean {
  return result.allowed && result.percentage ? result.percentage >= 80 && result.percentage < 90 : false;
}
