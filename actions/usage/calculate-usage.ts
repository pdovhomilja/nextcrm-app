"use server";

import { prismadb } from "@/lib/prisma";
import { OrganizationPlan } from "@prisma/client";

interface UsageMetrics {
  usersCount: number;
  contactsCount: number;
  storageBytes: number;
  projectsCount: number;
  documentsCount: number;
  accountsCount: number;
  leadsCount: number;
  opportunitiesCount: number;
  tasksCount: number;
}

/**
 * Calculate all usage metrics for an organization
 * This is an expensive operation that should be called periodically (daily)
 * rather than on every request. Results are cached in OrganizationUsage table.
 */
export async function calculateOrganizationUsage(
  organizationId: string
): Promise<UsageMetrics> {
  try {
    // Get all users in the organization
    const usersCount = await prismadb.users.count({
      where: {
        organizationId,
      },
    });

    // Get all contacts for the organization
    const contactsCount = await prismadb.crm_Contacts.count({
      where: {
        organizationId,
      },
    });

    // Get all documents and sum their storage
    const documents = await prismadb.documents.findMany({
      where: {
        organizationId,
      },
      select: {
        size: true,
      },
    });

    const storageBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);

    // Get all projects (boards in this system)
    const projectsCount = await prismadb.boards.count({
      where: {
        organizationId,
      },
    });

    // Get all documents count
    const documentsCount = documents.length;

    // Get all accounts
    const accountsCount = await prismadb.crm_Accounts.count({
      where: {
        organizationId,
      },
    });

    // Get all leads
    const leadsCount = await prismadb.crm_Leads.count({
      where: {
        organizationId,
      },
    });

    // Get all opportunities
    const opportunitiesCount = await prismadb.crm_Opportunities.count({
      where: {
        organizationId,
      },
    });

    // Get all tasks
    const tasksCount = await prismadb.tasks.count({
      where: {
        organizationId,
      },
    });

    const metrics: UsageMetrics = {
      usersCount,
      contactsCount,
      storageBytes,
      projectsCount,
      documentsCount,
      accountsCount,
      leadsCount,
      opportunitiesCount,
      tasksCount,
    };

    // Upsert the usage record
    await prismadb.organizationUsage.upsert({
      where: {
        organizationId,
      },
      create: {
        organizationId,
        ...metrics,
      },
      update: {
        ...metrics,
        lastCalculatedAt: new Date(),
      },
    });

    return metrics;
  } catch (error) {
    console.error("[CALCULATE_USAGE]", error);
    throw error;
  }
}

/**
 * Batch calculate usage for all organizations
 * Useful for scheduled cron jobs
 */
export async function calculateAllOrganizationsUsage(): Promise<void> {
  try {
    const organizations = await prismadb.organizations.findMany({
      select: {
        id: true,
      },
    });

    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < organizations.length; i += batchSize) {
      const batch = organizations.slice(i, i + batchSize);
      await Promise.all(batch.map((org) => calculateOrganizationUsage(org.id)));
    }

    console.log(`[CALCULATE_ALL_USAGE] Processed ${organizations.length} organizations`);
  } catch (error) {
    console.error("[CALCULATE_ALL_USAGE]", error);
    throw error;
  }
}
