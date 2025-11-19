/**
 * Health Check API
 * Monitors system health including database, circuit breaker, and external services
 * Response time target: <500ms
 */

import { NextResponse } from "next/server";
import { getDatabaseStatus } from "@/lib/prisma-optimized";
import { dbCircuitBreaker } from "@/lib/db-circuit-breaker";
import { isRedisHealthy } from "@/lib/rate-limit-redis";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: CheckResult;
    circuitBreaker: CircuitBreakerCheck;
    redis: CheckResult;
  };
  uptime: number;
  responseTime: number;
  version: string;
}

interface CheckResult {
  status: "up" | "down" | "degraded";
  responseTime?: number;
  message?: string;
  error?: string;
}

interface CircuitBreakerCheck extends CheckResult {
  state?: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureCount?: number;
  successCount?: number;
  failureRate?: string;
}

/**
 * Check database connectivity with circuit breaker status
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    const dbStatus = await getDatabaseStatus();

    return {
      status: dbStatus.connected ? "up" : "down",
      responseTime: Date.now() - startTime,
      message: dbStatus.connected
        ? "Database connection successful"
        : "Database connection failed",
      error: dbStatus.error,
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
 * Check circuit breaker status
 */
function checkCircuitBreaker(): CircuitBreakerCheck {
  const metrics = dbCircuitBreaker.getMetrics();

  let status: "up" | "down" | "degraded";
  if (metrics.state === "CLOSED") {
    status = "up";
  } else if (metrics.state === "HALF_OPEN") {
    status = "degraded";
  } else {
    status = "down";
  }

  return {
    status,
    state: metrics.state,
    failureCount: metrics.failureCount,
    successCount: metrics.successCount,
    failureRate: metrics.failureRate,
    message: `Circuit breaker is ${metrics.state}`,
  };
}

/**
 * Check Redis connectivity
 */
function checkRedis(): CheckResult {
  const isHealthy = isRedisHealthy();

  return {
    status: isHealthy ? "up" : "degraded",
    message: isHealthy
      ? "Redis connection healthy"
      : "Redis unavailable (fail-open mode)",
  };
}

/**
 * Determine overall system status
 */
function determineOverallStatus(checks: {
  database: CheckResult;
  circuitBreaker: CircuitBreakerCheck;
  redis: CheckResult;
}): "healthy" | "degraded" | "unhealthy" {
  // Database is critical
  if (checks.database.status === "down") {
    return "unhealthy";
  }

  // Circuit breaker OPEN is unhealthy
  if (checks.circuitBreaker.status === "down") {
    return "unhealthy";
  }

  // Redis being down is degraded, not unhealthy (we fail-open)
  if (
    checks.redis.status === "down" ||
    checks.redis.status === "degraded"
  ) {
    return "degraded";
  }

  // Circuit breaker HALF_OPEN is degraded
  if (checks.circuitBreaker.status === "degraded") {
    return "degraded";
  }

  return "healthy";
}

/**
 * GET /api/health
 * Basic health check endpoint
 * Target response time: <500ms
 */
export async function GET() {
  const requestStartTime = Date.now();

  try {
    // Run all health checks in parallel
    const [databaseCheck, circuitBreakerCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkCircuitBreaker()),
      Promise.resolve(checkRedis()),
    ]);

    const checks = {
      database: databaseCheck,
      circuitBreaker: circuitBreakerCheck,
      redis: redisCheck,
    };

    const overallStatus = determineOverallStatus(checks);
    const responseTime = Date.now() - requestStartTime;

    const healthCheck: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      responseTime,
      version: process.env.npm_package_version || "0.0.3-beta",
    };

    // Log warning if response time exceeds target
    if (responseTime > 500) {
      console.warn(`[Health Check] Response time exceeded target: ${responseTime}ms > 500ms`);
    }

    // Return appropriate status code
    const statusCode =
      overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    console.error("Health check error:", error);

    const responseTime = Date.now() - requestStartTime;

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        uptime: process.uptime(),
        responseTime,
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/health
 * Detailed health check for admins (includes statistics)
 */
export async function POST() {
  const requestStartTime = Date.now();

  try {
    const { prisma } = await import("@/lib/prisma-optimized");

    // Get detailed system statistics
    const [
      totalOrganizations,
      totalUsers,
      totalContacts,
      totalDocuments,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.organizations.count(),
      prisma.users.count(),
      prisma.crm_Contacts.count(),
      prisma.documents.count(),
      prisma.subscriptions.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    const [databaseCheck, circuitBreakerCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkCircuitBreaker()),
      Promise.resolve(checkRedis()),
    ]);

    const checks = {
      database: databaseCheck,
      circuitBreaker: circuitBreakerCheck,
      redis: redisCheck,
    };

    const overallStatus = determineOverallStatus(checks);
    const responseTime = Date.now() - requestStartTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      responseTime,
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
        responseTime: Date.now() - requestStartTime,
      },
      { status: 503 }
    );
  }
}
