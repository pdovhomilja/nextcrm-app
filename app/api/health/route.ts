/**
 * Health Check API
 * Monitors system health and external service availability
 */

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: CheckResult;
    stripe: CheckResult;
  };
  uptime: number;
  version: string;
}

interface CheckResult {
  status: "up" | "down" | "degraded";
  responseTime?: number;
  message?: string;
  error?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    // Simple query to check connection
    await prismadb.users.count();

    return {
      status: "up",
      responseTime: Date.now() - startTime,
      message: "Database connection successful",
    };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check Stripe API availability
 */
async function checkStripe(): Promise<CheckResult> {
  const startTime = Date.now();

  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      status: "degraded",
      message: "Stripe not configured",
    };
  }

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Simple API call to check connectivity
    await stripe.products.list({ limit: 1 });

    return {
      status: "up",
      responseTime: Date.now() - startTime,
      message: "Stripe API connection successful",
    };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Determine overall system status
 */
function determineOverallStatus(checks: {
  database: CheckResult;
  stripe: CheckResult;
}): "healthy" | "degraded" | "unhealthy" {
  // Database is critical
  if (checks.database.status === "down") {
    return "unhealthy";
  }

  // Stripe being down is degraded, not unhealthy
  if (checks.stripe.status === "down") {
    return "degraded";
  }

  // If any service is degraded
  if (
    checks.database.status === "degraded" ||
    checks.stripe.status === "degraded"
  ) {
    return "degraded";
  }

  return "healthy";
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Run all health checks in parallel
    const [databaseCheck, stripeCheck] = await Promise.all([
      checkDatabase(),
      checkStripe(),
    ]);

    const checks = {
      database: databaseCheck,
      stripe: stripeCheck,
    };

    const overallStatus = determineOverallStatus(checks);

    const healthCheck: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
    };

    // Return appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 :
                      overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    console.error("Health check error:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        uptime: process.uptime(),
      },
      { status: 503 }
    );
  }
}

/**
 * Detailed health check for admins
 */
export async function POST() {
  try {
    // Get detailed system statistics
    const [
      totalOrganizations,
      totalUsers,
      totalContacts,
      totalDocuments,
      activeSubscriptions,
    ] = await Promise.all([
      prismadb.organizations.count(),
      prismadb.users.count(),
      prismadb.crm_Contacts.count(),
      prismadb.documents.count(),
      prismadb.subscriptions.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    const [databaseCheck, stripeCheck] = await Promise.all([
      checkDatabase(),
      checkStripe(),
    ]);

    const checks = {
      database: databaseCheck,
      stripe: stripeCheck,
    };

    const overallStatus = determineOverallStatus(checks);

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      statistics: {
        organizations: totalOrganizations,
        users: totalUsers,
        contacts: totalContacts,
        documents: totalDocuments,
        activeSubscriptions,
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
      },
    });
  } catch (error) {
    console.error("Detailed health check error:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
