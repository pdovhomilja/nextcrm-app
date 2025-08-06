import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";

/**
 * GET /api/ai/agents/metrics - Get detailed agent performance metrics
 */
export async function GET() {
  try {
    // Validate session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get comprehensive metrics
    const performanceMetrics = agentOrchestrator.getPerformanceMetrics();
    const mcpStatus = mcpClientPool.getServerStatus();

    // Calculate system-wide metrics
    const totalQueries = Object.values(performanceMetrics).reduce(
      (sum, metrics) => sum + metrics.totalQueries,
      0
    );

    const avgSystemProcessingTime =
      Object.values(performanceMetrics).reduce(
        (sum, metrics) =>
          sum + metrics.avgProcessingTime * metrics.totalQueries,
        0
      ) / Math.max(totalQueries, 1);

    const avgSystemConfidence =
      Object.values(performanceMetrics).reduce(
        (sum, metrics) => sum + metrics.avgConfidence * metrics.totalQueries,
        0
      ) / Math.max(totalQueries, 1);

    const systemSuccessRate =
      Object.values(performanceMetrics).reduce(
        (sum, metrics) => sum + metrics.successRate * metrics.totalQueries,
        0
      ) / Math.max(totalQueries, 1);

    // Get health summary
    const healthySystems = mcpStatus.filter(
      (s) => s.status === "healthy"
    ).length;
    const systemHealth = healthySystems / Math.max(mcpStatus.length, 1);

    return NextResponse.json({
      success: true,
      data: {
        agentMetrics: performanceMetrics,
        systemMetrics: {
          totalQueries,
          avgProcessingTime: Math.round(avgSystemProcessingTime),
          avgConfidence: Math.round(avgSystemConfidence * 100) / 100,
          successRate: Math.round(systemSuccessRate * 100) / 100,
          systemHealth: Math.round(systemHealth * 100) / 100,
        },
        mcpServerHealth: mcpStatus.map((server) => ({
          name: server.name,
          status: server.status,
          description: server.description,
          toolCount: server.toolCount,
          lastHealthCheck: server.lastHealthCheck,
          uptimeHours:
            Math.round(
              ((Date.now() - server.lastHealthCheck.getTime()) /
                (1000 * 60 * 60)) *
                100
            ) / 100,
        })),
        insights: {
          mostUsedAgent: Object.entries(performanceMetrics).reduce(
            (best, [agent, metrics]) =>
              metrics.totalQueries >
              (performanceMetrics[best]?.totalQueries || 0)
                ? agent
                : best,
            "none"
          ),
          fastestAgent: Object.entries(performanceMetrics).reduce(
            (best, [agent, metrics]) =>
              metrics.avgProcessingTime <
              (performanceMetrics[best]?.avgProcessingTime || Infinity)
                ? agent
                : best,
            "none"
          ),
          mostConfidentAgent: Object.entries(performanceMetrics).reduce(
            (best, [agent, metrics]) =>
              metrics.avgConfidence >
              (performanceMetrics[best]?.avgConfidence || 0)
                ? agent
                : best,
            "none"
          ),
          systemRecommendations: generateSystemRecommendations(
            performanceMetrics,
            mcpStatus,
            systemHealth
          ),
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        reportingPeriod: "all-time",
        userId: session.user.id,
        companyId: session.user.cid,
      },
    });
  } catch (error) {
    console.error("Agent metrics API error:", error);

    return NextResponse.json(
      { error: "Failed to get agent metrics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/agents/metrics - Reset performance metrics
 */
export async function POST() {
  try {
    // Validate session and admin permissions
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin role required to reset metrics" },
        { status: 403 }
      );
    }

    // Reset metrics
    agentOrchestrator.resetPerformanceMetrics();

    return NextResponse.json({
      success: true,
      message: "Performance metrics reset successfully",
      metadata: {
        timestamp: new Date().toISOString(),
        resetBy: session.user.id,
        companyId: session.user.cid,
      },
    });
  } catch (error) {
    console.error("Agent metrics reset error:", error);

    return NextResponse.json(
      { error: "Failed to reset metrics" },
      { status: 500 }
    );
  }
}

/**
 * Generate system recommendations based on metrics
 */
function generateSystemRecommendations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  performanceMetrics: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mcpStatus: any[],
  systemHealth: number
): string[] {
  const recommendations: string[] = [];

  // Check system health
  if (systemHealth < 0.8) {
    recommendations.push(
      "System health below 80% - check MCP server connections"
    );
  }

  // Check for unhealthy MCP servers
  const unhealthyServers = mcpStatus.filter((s) => s.status !== "healthy");
  if (unhealthyServers.length > 0) {
    recommendations.push(
      `${unhealthyServers.length} MCP servers need attention: ${unhealthyServers.map((s) => s.name).join(", ")}`
    );
  }

  // Check agent performance
  Object.entries(performanceMetrics).forEach(
    ([agent, metrics]: [
      string,
      { successRate: number; avgProcessingTime: number; avgConfidence: number },
    ]) => {
      if (metrics.successRate < 0.9) {
        recommendations.push(
          `${agent} agent success rate below 90% - investigate error patterns`
        );
      }

      if (metrics.avgProcessingTime > 10000) {
        recommendations.push(
          `${agent} agent processing time above 10s - optimize performance`
        );
      }

      if (metrics.avgConfidence < 0.7) {
        recommendations.push(
          `${agent} agent confidence below 70% - review decision logic`
        );
      }
    }
  );

  // Check for low usage
  const totalQueries = Object.values(performanceMetrics).reduce(
    (sum: number, metrics: { totalQueries: number }) =>
      sum + metrics.totalQueries,
    0
  );

  if (totalQueries < 10) {
    recommendations.push(
      "Low agent usage detected - consider promoting AI features to users"
    );
  }

  return recommendations.length > 0
    ? recommendations
    : ["All systems operating normally"];
}
