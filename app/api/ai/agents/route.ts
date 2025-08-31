import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { ModelMessage } from "ai";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";
import { z } from "zod/v3";
import { allToolkits } from "@/lib/ai/toolkits";

// Schema for agent query requests, aligned with the new architecture
const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const toolCallPartSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.any()),
  input: z.record(z.any()),
});

const toolResultPartSchema = z.object({
  type: z.literal("tool-result"),
  toolName: z.string(),
  toolCallId: z.string(),
  output: z.any(),
});

const messageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().or(z.array(textPartSchema)),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z
      .string()
      .or(
        z.array(textPartSchema.or(toolCallPartSchema).or(toolResultPartSchema)),
      ),
  }),
  z.object({
    role: z.literal("system"),
    content: z.string(),
  }),
  z.object({
    role: z.literal("tool"),
    toolInvocations: z.array(
      z.object({
        toolCallId: z.string(),
        toolName: z.string(),
        args: z.record(z.any()),
        result: z.any().optional(),
      }),
    ),
  }),
]);

const agentQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(4000, "Query too long"),
  history: z.array(messageSchema).optional().default([]),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
});

/**
 * POST /api/ai/agents - Process query with the new AI agent architecture
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const activeCompanyId = session.user.activeCompanyId;

    if (!activeCompanyId) {
      return NextResponse.json(
        { error: "No company context available" },
        { status: 400 },
      );
    }

    // Check email verification
    // TODO: Implement proper email verification check
    // if (!session.user.emailVerified) {
    //   return NextResponse.json(
    //     { error: "Email verification required for AI features" },
    //     { status: 403 }
    //   );
    // }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = agentQuerySchema.parse(body);

    // Create agent context
    const agentContext = {
      userId: session.user.id,
      companyId: activeCompanyId,
      boardId: validatedRequest.boardId,
      taskId: validatedRequest.taskId,
      conversationId: `conv-${session.user.id}-${Date.now()}`,
      sessionData: {},
    };

    // Process query with orchestrator
    const result = await agentOrchestrator.orchestrate(
      validatedRequest.query,
      validatedRequest.history as ModelMessage[],
      undefined, // systemPromptOverride
      undefined, // requiredToolkitsOverride
      agentContext,
    );

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        companyId: activeCompanyId,
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
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Agent processing failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai/agents - Get system status and capabilities
 */
export async function GET() {
  try {
    // Get all available toolkits
    const availableToolkits = Object.keys(allToolkits);

    // Get MCP server status
    const mcpStatus = mcpClientPool.getServerStatus();

    return NextResponse.json({
      success: true,
      data: {
        toolkits: availableToolkits.map((name) => ({
          name,
          status: "available",
        })),
        mcpServers: mcpStatus,
        systemHealth: {
          totalToolkits: availableToolkits.length,
          healthyMcpServers: mcpStatus.filter((s) => s.status === "healthy")
            .length,
          totalMcpServers: mcpStatus.length,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: "5.0.0", // Reflects new agent architecture
      },
    });
  } catch (error) {
    console.error("Agent status API error:", error);

    return NextResponse.json(
      { error: "Failed to get agent status" },
      { status: 500 },
    );
  }
}
