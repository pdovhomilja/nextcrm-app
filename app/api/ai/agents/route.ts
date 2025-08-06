import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { AgentFactory } from "@/lib/ai/specialized-agents";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";
import { z } from "zod";

// Schema for agent query requests
const agentQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(4000, "Query too long"),
  agentType: z
    .enum(["analyzer", "recommender", "tracker", "optimizer"])
    .optional(),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
  multiAgentMode: z.boolean().default(false),
  maxAgents: z.number().min(1).max(4).default(3),
});

/**
 * POST /api/ai/agents - Process query with AI agents
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await auth();
    if (!session?.user?.cid) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check email verification
    if (!session.user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required for AI features" },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = agentQuerySchema.parse(body);

    // Create agent context
    const agentContext = {
      userId: session.user.id,
      companyId: session.user.cid,
      boardId: validatedRequest.boardId,
      taskId: validatedRequest.taskId,
      conversationId: `conv-${session.user.id}-${Date.now()}`,
    };

    // Process query with orchestrator
    const orchestrationRequest = {
      query: validatedRequest.query,
      context: agentContext,
      preferredAgent: validatedRequest.agentType,
      multiAgentMode: validatedRequest.multiAgentMode,
      maxAgents: validatedRequest.maxAgents,
    };

    const result = await agentOrchestrator.orchestrate(orchestrationRequest);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        companyId: session.user.cid,
        processingTime: result.metadata.totalProcessingTime,
      },
    });
  } catch (error) {
    console.error("Agent API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Agent processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/agents - Get agent status and capabilities
 */
export async function GET() {
  try {
    // Get all available agents
    const availableAgents = AgentFactory.getAvailableAgents();

    // Get agent status information
    const agentStatuses = await Promise.all(
      availableAgents.map(async (agentType) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const agent = await AgentFactory.getAgent(agentType as any);
          return {
            type: agentType,
            ...agent.getStatus(),
            capabilities: agent.getCapabilities(),
          };
        } catch (error) {
          console.error(`Failed to get status for agent ${agentType}:`, error);
          return {
            type: agentType,
            agentId: agentType,
            role: agentType,
            isInitialized: false,
            toolCount: 0,
            activeConversations: 0,
            capabilities: [],
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Get MCP server status
    const mcpStatus = mcpClientPool.getServerStatus();

    // Get performance metrics
    const performanceMetrics = agentOrchestrator.getPerformanceMetrics();

    return NextResponse.json({
      success: true,
      data: {
        agents: agentStatuses,
        mcpServers: mcpStatus,
        performanceMetrics,
        systemHealth: {
          totalAgents: availableAgents.length,
          initializedAgents: agentStatuses.filter((a) => a.isInitialized)
            .length,
          healthyMcpServers: mcpStatus.filter((s) => s.status === "healthy")
            .length,
          totalMcpServers: mcpStatus.length,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "4.0.0",
      },
    });
  } catch (error) {
    console.error("Agent status API error:", error);

    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 }
    );
  }
}
