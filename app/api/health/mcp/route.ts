import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    database: false,
    redis: false as boolean | null,
    mcpServers: {} as Record<string, boolean>,
    authentication: false,
    pgvector: false as boolean | null,
    overall: false,
  };

  try {
    // Test database connection
    const { default: db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    healthChecks.database = true;

    // Test pgvector availability (if enabled)
    if (process.env.PGVECTOR_ENABLED === "true") {
      try {
        await db.$queryRaw`SELECT '[1,2,3]'::vector`;
        healthChecks.pgvector = true;
      } catch (error) {
        console.warn("pgvector not available:", error);
        healthChecks.pgvector = false;
      }
    } else {
      healthChecks.pgvector = null; // Not enabled
    }
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  try {
    // Test authentication system
    await auth();
    healthChecks.authentication = true; // If this doesn't throw, auth is working
  } catch (error) {
    console.error("Authentication health check failed:", error);
  }

  try {
    // Test Redis connection (if enabled)
    if (process.env.REDIS_URL && process.env.MCP_SSE_ENABLED === "true") {
      const { createClient } = await import("redis");
      const redis = createClient({
        url: process.env.REDIS_URL,
      });
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      healthChecks.redis = true;
    } else {
      healthChecks.redis = null; // Not configured
    }
  } catch (error) {
    console.error("Redis health check failed:", error);
    healthChecks.redis = false;
  }

  // Test MCP servers
  const mcpEndpoints = [
    { name: "base", url: "/api/mcp/sse" },
    { name: "tasks", url: "/api/mcp/tasks/sse" },
    { name: "search", url: "/api/mcp/search/sse" },
  ];

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  for (const endpoint of mcpEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${baseUrl}${endpoint.url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TaskHQ-Health-Check/1.0",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      healthChecks.mcpServers[endpoint.name] = response.ok;
    } catch (error) {
      console.error(`MCP server ${endpoint.name} health check failed:`, error);
      healthChecks.mcpServers[endpoint.name] = false;
    }
  }

  // Calculate overall health
  const criticalServices = [healthChecks.database, healthChecks.authentication];
  const optionalServices = [
    healthChecks.redis,
    healthChecks.pgvector,
    ...Object.values(healthChecks.mcpServers),
  ].filter((service) => service !== null); // Filter out disabled services

  const criticalHealthy = criticalServices.every(Boolean);
  const optionalHealthy =
    optionalServices.length === 0 || optionalServices.every(Boolean);

  healthChecks.overall = criticalHealthy && optionalHealthy;

  // Detailed status information
  const statusInfo = {
    ...healthChecks,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      aiEnabled: process.env.AI_FEATURES_ENABLED === "true",
      mcpEnabled: process.env.MCP_TOOLS_ENABLED === "true",
      pgvectorEnabled: process.env.PGVECTOR_ENABLED === "true",
      redisEnabled: process.env.MCP_SSE_ENABLED === "true",
    },
    services: {
      critical: {
        database: healthChecks.database,
        authentication: healthChecks.authentication,
      },
      optional: {
        redis: healthChecks.redis,
        pgvector: healthChecks.pgvector,
        mcpServers: healthChecks.mcpServers,
      },
    },
    recommendations: [] as string[],
  };

  // Add recommendations based on failed services
  if (!healthChecks.database) {
    statusInfo.recommendations.push(
      "Check database connection and ensure PostgreSQL is running"
    );
  }
  if (!healthChecks.authentication) {
    statusInfo.recommendations.push(
      "Verify AUTH_SECRET and authentication configuration"
    );
  }
  if (healthChecks.redis === false) {
    statusInfo.recommendations.push(
      "Check Redis connection for MCP SSE transport"
    );
  }
  if (
    healthChecks.pgvector === false &&
    process.env.PGVECTOR_ENABLED === "true"
  ) {
    statusInfo.recommendations.push(
      "Install pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;"
    );
  }

  const failedMcpServers = Object.entries(healthChecks.mcpServers)
    .filter(([, healthy]) => !healthy)
    .map(([name]) => name);

  if (failedMcpServers.length > 0) {
    statusInfo.recommendations.push(
      `MCP servers not responding: ${failedMcpServers.join(", ")}`
    );
  }

  if (statusInfo.recommendations.length === 0) {
    statusInfo.recommendations.push("All systems operational");
  }

  return NextResponse.json(statusInfo, {
    status: healthChecks.overall ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
