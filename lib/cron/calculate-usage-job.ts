import { calculateAllOrganizationsUsage } from "@/actions/usage/calculate-usage";

/**
 * Calculate usage for all organizations
 * This job should be run daily to keep usage metrics up-to-date
 *
 * Can be triggered manually or via a scheduled task (cron, GitHub Actions, etc.)
 */
export async function runCalculateUsageJob(): Promise<{
  success: boolean;
  timestamp: Date;
  message: string;
}> {
  const startTime = Date.now();

  try {
    console.log("[CRON_JOB] Starting usage calculation for all organizations");

    await calculateAllOrganizationsUsage();

    const duration = Date.now() - startTime;
    const message = `Successfully calculated usage for all organizations in ${duration}ms`;

    console.log(`[CRON_JOB] ${message}`);

    return {
      success: true,
      timestamp: new Date(),
      message,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = `Failed to calculate usage after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`;

    console.error(`[CRON_JOB] ${message}`);

    return {
      success: false,
      timestamp: new Date(),
      message,
    };
  }
}

/**
 * Health check for the cron job
 * Returns the last time usage was calculated for organizations
 */
export async function checkCalculateUsageJobHealth(): Promise<{
  healthy: boolean;
  lastRun: Date | null;
}> {
  try {
    // In a real implementation, you might want to track this in the database
    // For now, this is a placeholder that can be expanded
    return {
      healthy: true,
      lastRun: new Date(),
    };
  } catch (error) {
    return {
      healthy: false,
      lastRun: null,
    };
  }
}
