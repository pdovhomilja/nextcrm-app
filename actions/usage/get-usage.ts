"use server";

import { prismadb } from "@/lib/prisma";
import { getPlanLimits, PLANS } from "@/lib/subscription-plans";
import { OrganizationPlan } from "@prisma/client";

export interface UsageWithLimits {
  plan: OrganizationPlan;
  metrics: {
    usersCount: number;
    contactsCount: number;
    storageBytes: number;
    projectsCount: number;
    documentsCount: number;
    accountsCount: number;
    leadsCount: number;
    opportunitiesCount: number;
    tasksCount: number;
  };
  limits: {
    users: number;
    contacts: number;
    storage: number;
    projects: number;
    documents: number;
  };
  lastCalculatedAt: Date | null;
}

/**
 * Get current usage metrics with plan limits for an organization
 * Returns cached data from OrganizationUsage table
 */
export async function getOrganizationUsage(
  organizationId: string
): Promise<UsageWithLimits | null> {
  try {
    const organization = await prismadb.organizations.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        plan: true,
        usage: true,
      },
    });

    if (!organization) {
      return null;
    }

    const plan = organization.plan;
    const limits = getPlanLimits(plan);

    // If usage record doesn't exist, create a default one
    let usage = organization.usage;
    if (!usage) {
      usage = await prismadb.organizationUsage.create({
        data: {
          organizationId,
          usersCount: 0,
          contactsCount: 0,
          storageBytes: 0,
          projectsCount: 0,
          documentsCount: 0,
          accountsCount: 0,
          leadsCount: 0,
          opportunitiesCount: 0,
          tasksCount: 0,
        },
      });
    }

    return {
      plan,
      metrics: {
        usersCount: usage.usersCount,
        contactsCount: usage.contactsCount,
        storageBytes: usage.storageBytes,
        projectsCount: usage.projectsCount,
        documentsCount: usage.documentsCount,
        accountsCount: usage.accountsCount,
        leadsCount: usage.leadsCount,
        opportunitiesCount: usage.opportunitiesCount,
        tasksCount: usage.tasksCount,
      },
      limits,
      lastCalculatedAt: usage.lastCalculatedAt,
    };
  } catch (error) {
    console.error("[GET_USAGE]", error);
    throw error;
  }
}

/**
 * Get usage percentage for each resource
 * Useful for progress bars and indicators
 */
export async function getUsagePercentages(
  organizationId: string
): Promise<{
  users: number;
  contacts: number;
  storage: number;
  projects: number;
  documents: number;
} | null> {
  const usage = await getOrganizationUsage(organizationId);
  if (!usage) return null;

  const calculatePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  return {
    users: calculatePercentage(usage.metrics.usersCount, usage.limits.users),
    contacts: calculatePercentage(usage.metrics.contactsCount, usage.limits.contacts),
    storage: calculatePercentage(usage.metrics.storageBytes, usage.limits.storage),
    projects: calculatePercentage(usage.metrics.projectsCount, usage.limits.projects),
    documents: calculatePercentage(usage.metrics.documentsCount, usage.limits.documents),
  };
}
