"use server";

import { getOrganizationUsage } from "./get-usage";
import { OrganizationPlan } from "@prisma/client";

export type ResourceType =
  | "users"
  | "contacts"
  | "storage"
  | "projects"
  | "documents"
  | "accounts"
  | "leads"
  | "opportunities"
  | "tasks";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  percentage: number;
  reason?: string;
  upgradeRequired?: boolean;
  unlimited?: boolean;
}

/**
 * Check if an action would exceed the organization's quota
 * Returns detailed information about usage and limits
 */
export async function checkQuota(
  resource: ResourceType,
  organizationId: string,
  additionalUsage: number = 1
): Promise<QuotaCheckResult> {
  try {
    const usage = await getOrganizationUsage(organizationId);
    if (!usage) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        percentage: 0,
        reason: "Organization not found",
        upgradeRequired: false,
      };
    }

    // Map resource type to the correct metric
    const metricMap: Record<ResourceType, keyof typeof usage.metrics> = {
      users: "usersCount",
      contacts: "contactsCount",
      storage: "storageBytes",
      projects: "projectsCount",
      documents: "documentsCount",
      accounts: "accountsCount",
      leads: "leadsCount",
      opportunities: "opportunitiesCount",
      tasks: "tasksCount",
    };

    const limitMap: Record<ResourceType, keyof typeof usage.limits> = {
      users: "users",
      contacts: "contacts",
      storage: "storage",
      projects: "projects",
      documents: "documents",
      accounts: "contacts", // accounts use contact limit
      leads: "contacts", // leads use contact limit
      opportunities: "contacts", // opportunities use contact limit
      tasks: "projects", // tasks use project limit
    };

    const metricKey = metricMap[resource];
    const limitKey = limitMap[resource];

    const currentUsage = usage.metrics[metricKey] as number;
    const limit = usage.limits[limitKey] as number;
    const newUsage = currentUsage + additionalUsage;

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        used: currentUsage,
        limit: -1,
        percentage: 0,
        unlimited: true,
      };
    }

    const percentage = (newUsage / limit) * 100;
    const allowed = newUsage <= limit;

    if (!allowed) {
      const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1);
      return {
        allowed: false,
        used: currentUsage,
        limit,
        percentage,
        reason: `You have reached your ${resourceLabel} limit (${currentUsage}/${limit}). Upgrade your plan to add more.`,
        upgradeRequired: true,
      };
    }

    // Approaching limit (80%+)
    if (percentage >= 80) {
      const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1);
      return {
        allowed: true,
        used: currentUsage,
        limit,
        percentage,
        reason: `You are approaching your ${resourceLabel} limit (${newUsage}/${limit}).`,
        upgradeRequired: false,
      };
    }

    return {
      allowed: true,
      used: currentUsage,
      limit,
      percentage,
    };
  } catch (error) {
    console.error("[CHECK_QUOTA]", error);
    return {
      allowed: false,
      used: 0,
      limit: 0,
      percentage: 0,
      reason: "Error checking quota",
      upgradeRequired: false,
    };
  }
}

/**
 * Check multiple quotas at once
 * Returns object with QuotaCheckResult for each resource
 */
export async function checkMultipleQuotas(
  resources: ResourceType[],
  organizationId: string
): Promise<Record<ResourceType, QuotaCheckResult>> {
  const results: Partial<Record<ResourceType, QuotaCheckResult>> = {};

  for (const resource of resources) {
    results[resource] = await checkQuota(resource, organizationId);
  }

  return results as Record<ResourceType, QuotaCheckResult>;
}

/**
 * Get all resources that are approaching or at their limit
 */
export async function getResourcesAtRisk(
  organizationId: string
): Promise<{
  approaching: ResourceType[];
  exceeded: ResourceType[];
}> {
  const resources: ResourceType[] = [
    "users",
    "contacts",
    "storage",
    "projects",
    "documents",
  ];

  const results = await checkMultipleQuotas(resources, organizationId);

  const approaching: ResourceType[] = [];
  const exceeded: ResourceType[] = [];

  for (const resource of resources) {
    const result = results[resource];
    if (!result.allowed) {
      exceeded.push(resource);
    } else if (result.percentage && result.percentage >= 80) {
      approaching.push(resource);
    }
  }

  return {
    approaching,
    exceeded,
  };
}
