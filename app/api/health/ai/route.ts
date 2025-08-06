import { NextResponse } from "next/server";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";
import { aiMetrics } from "@/lib/monitoring/ai-metrics";
import { embeddingStorageService } from "@/lib/ai/embedding-storage";
import db from "@/lib/db";

interface HealthCheck {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  responseTime: number;
  lastChecked: Date;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const startTime = Date.now();

  // Check MCP servers
  try {
    const mcpStartTime = Date.now();
    const serverStatus = mcpClientPool.getServerStatus();
    const healthyServers = serverStatus.filter((s) => s.status === "healthy");

    checks.push({
      service: "MCP Servers",
      status:
        healthyServers.length === serverStatus.length
          ? "healthy"
          : healthyServers.length > 0
            ? "degraded"
            : "unhealthy",
      details: {
        totalServers: serverStatus.length,
        healthyServers: healthyServers.length,
        servers: serverStatus,
      },
      responseTime: Date.now() - mcpStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "MCP Servers",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
    });
  }

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    await db.$queryRaw`SELECT 1`;

    checks.push({
      service: "Database",
      status: "healthy",
      details: { connection: "active" },
      responseTime: Date.now() - dbStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "Database",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Check vector database
  try {
    const vectorStartTime = Date.now();
    const stats = await embeddingStorageService.getEmbeddingStats();

    checks.push({
      service: "Vector Database",
      status: stats.totalTaskEmbeddings > 0 ? "healthy" : "degraded",
      details: {
        taskEmbeddings: stats.totalTaskEmbeddings,
        boardEmbeddings: stats.totalBoardEmbeddings,
        avgAge: stats.avgEmbeddingAge,
      },
      responseTime: Date.now() - vectorStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "Vector Database",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Check AI metrics and performance
  try {
    const metricsStartTime = Date.now();
    const allMetrics = aiMetrics.getAllMetrics();
    const recentPerformance = aiMetrics.getRecentPerformance("chat", 30);

    const highErrorRate = Object.values(allMetrics).some(
      (m) => m.errorRate > 0.1
    );
    const slowResponse = recentPerformance.averageResponseTime > 5000; // 5 seconds

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (highErrorRate || slowResponse) {
      status = "degraded";
    }

    checks.push({
      service: "AI Performance",
      status,
      details: {
        operations: Object.keys(allMetrics),
        recentPerformance,
        totalRequests: Object.values(allMetrics).reduce(
          (sum, m) => sum + m.requestCount,
          0
        ),
        totalCost: Object.values(allMetrics).reduce(
          (sum, m) => sum + m.totalCost,
          0
        ),
      },
      responseTime: Date.now() - metricsStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "AI Performance",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Overall health determination
  const unhealthyCount = checks.filter((c) => c.status === "unhealthy").length;
  const degradedCount = checks.filter((c) => c.status === "degraded").length;

  let overallStatus: "healthy" | "degraded" | "unhealthy";
  if (unhealthyCount > 0) {
    overallStatus = "unhealthy";
  } else if (degradedCount > 0) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  const responseCode =
    overallStatus === "healthy"
      ? 200
      : overallStatus === "degraded"
        ? 200
        : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalResponseTime: Date.now() - startTime,
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter((c) => c.status === "healthy").length,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
    },
    { status: responseCode }
  );
}
