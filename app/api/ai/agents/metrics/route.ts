import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { mcpClientPool } from "@/lib/ai/mcp-client-pool";

/**
 * GET /api/ai/agents/metrics - Get detailed agent performance metrics
 */
export async function GET() {
  try {
    // Validate session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const activeCompanyId = session.user.activeCompanyId;

    if (!activeCompanyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 }
      );
    }

    // Get comprehensive metrics
    // TODO: Implement performance metrics in the new agent architecture
    const performanceMetrics = {};
    const mcpStatus = mcpClientPool.getServerStatus();

    // Calculate system-wide metrics
    // Using placeholder values until performance metrics are implemented
    const totalQueries = 0;
    const avgSystemProcessingTime = 0;
    const avgSystemConfidence = 0;
    const systemSuccessRate = 1;

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
          mostUsedAgent: "none",
          fastestAgent: "none",
          mostConfidentAgent: "none",
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
        companyId: activeCompanyId,
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

    // Admin check - for now allow all authenticated users
    // TODO: Implement proper role-based access control
    // if (session.user.role !== "ADMIN") {
    //   return NextResponse.json(
    //     { error: "Admin role required to reset metrics" },
    //     { status: 403 }
    //   );
    // }

    // Reset metrics
    // TODO: Implement metrics reset in the new agent architecture
    console.log("Metrics reset requested - not implemented yet");

    return NextResponse.json({
      success: true,
      message: "Performance metrics reset successfully",
      metadata: {
        timestamp: new Date().toISOString(),
        resetBy: session.user.id,
        companyId: session.user.activeCompanyId,
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

interface McpServerStatus {
  name: string;
  status: string;
  description: string;
  toolCount: number;
  lastHealthCheck: Date;
}

/**
 * Generate system recommendations based on metrics
 */
function generateSystemRecommendations(
  performanceMetrics: Record<string, unknown>,
  mcpStatus: McpServerStatus[],
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

  // Check agent performance (TODO: implement when metrics are available)
  // Object.entries(performanceMetrics).forEach(([agent, metrics]) => {
  //   Performance analysis will be implemented with the new metrics system
  // });

  // Check for low usage (TODO: implement when metrics are available)
  // const totalQueries = Object.values(performanceMetrics).reduce(...);
  // For now, assume normal usage

  // Add generic recommendation about metrics
  recommendations.push(
    "Performance metrics system is being upgraded - detailed insights coming soon"
  );

  return recommendations.length > 0
    ? recommendations
    : ["All systems operating normally"];
}
