import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ragProcessor } from "@/lib/ai/rag-processor";
import { validateAIConfig } from "@/lib/ai/config";
import { streamText } from "ai";
import { aiConfig } from "@/lib/ai/config";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { z } from "zod";

// Request validation schema
const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
  agentType: z
    .enum(["analyzer", "recommender", "tracker", "optimizer"])
    .optional(),
  useRAG: z.boolean().default(true),
  multiAgent: z.boolean().default(false),
  contextType: z
    .enum(["general", "task_specific", "board_analysis", "recommendation"])
    .optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
      includeSources: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate AI configuration
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: "AI configuration invalid",
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedRequest = ChatRequestSchema.parse(body);

    // Get the last user message
    const userMessages = validatedRequest.messages.filter(
      (msg) => msg.role === "user"
    );
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 }
      );
    }

    // Check if streaming is requested
    const acceptHeader = request.headers.get("accept");
    const wantsStream = acceptHeader?.includes("text/stream");

    const activeCompanyId = session.user.activeCompanyId;
    
    if (!activeCompanyId) {
      return NextResponse.json({ error: "No company context available" }, { status: 400 });
    }

    const context = {
      userId: session.user.id,
      companyId: activeCompanyId,
      boardId: validatedRequest.boardId,
      taskId: validatedRequest.taskId,
      conversationId: `conv-${session.user.id}-${Date.now()}`,
    };

    if (wantsStream) {
      // Return streaming response with agent integration
      const streamResult = await streamRAGResponse(
        lastUserMessage.content,
        activeCompanyId,
        session.user.id,
        validatedRequest.boardId,
        validatedRequest.taskId,
        validatedRequest.agentType,
        validatedRequest.useRAG,
        validatedRequest.multiAgent,
        validatedRequest.contextType,
        validatedRequest.options
      );
      return streamResult.toTextStreamResponse();
    } else {
      // Return complete response with agent orchestration
      if (validatedRequest.agentType || validatedRequest.multiAgent) {
        // Use AI agent orchestration
        const orchestrationRequest = {
          query: lastUserMessage.content,
          context,
          preferredAgent: validatedRequest.agentType,
          multiAgentMode: validatedRequest.multiAgent,
        };

        const agentResponse =
          await agentOrchestrator.orchestrate(orchestrationRequest);

        return NextResponse.json({
          success: true,
          response: agentResponse.primaryResponse,
          agentResponses: agentResponse.agentResponses,
          coordinatedInsights: agentResponse.coordinatedInsights,
          metadata: agentResponse.metadata,
        });
      } else if (validatedRequest.useRAG) {
        // Use RAG processing
        const ragQuery = {
          query: lastUserMessage.content,
          companyId: activeCompanyId,
          userId: session.user.id,
          boardId: validatedRequest.boardId,
          taskId: validatedRequest.taskId,
          contextType: validatedRequest.contextType,
          options: validatedRequest.options,
        };

        const ragResponse = await ragProcessor.processQuery(ragQuery);

        return NextResponse.json({
          success: true,
          response: ragResponse.response,
          confidence: ragResponse.confidence,
          sources: ragResponse.sources,
          contextSummary: ragResponse.contextSummary,
          suggestedActions: ragResponse.suggestedActions,
          queryClassification: ragResponse.queryClassification,
          processingTime: ragResponse.processingTime,
        });
      } else {
        // Direct response without special context
        return NextResponse.json({
          success: true,
          response:
            "I'm ready to help with your project management tasks. Please ask me anything about your projects, tasks, or team coordination.",
          confidence: 1.0,
        });
      }
    }
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Streaming response function
async function streamRAGResponse(
  query: string,
  companyId: string,
  userId: string,
  boardId?: string,
  taskId?: string,
  agentType?: "analyzer" | "recommender" | "tracker" | "optimizer",
  useRAG: boolean = true,
  multiAgent: boolean = false,
  contextType?:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation",
  options?: {
    temperature?: number;
    maxTokens?: number;
    includeSources?: boolean;
  }
) {
  const context = {
    userId,
    companyId,
    boardId,
    taskId,
    conversationId: `conv-${userId}-${Date.now()}`,
  };

  try {
    let systemPrompt: string;
    let contextInfo = "";

    if (agentType || multiAgent) {
      // Use AI agent orchestration for context
      const orchestrationRequest = {
        query,
        context,
        preferredAgent: agentType,
        multiAgentMode: multiAgent,
      };

      const agentResponse =
        await agentOrchestrator.orchestrate(orchestrationRequest);

      systemPrompt = `You are an intelligent project management assistant powered by specialized AI agents.

Agent Analysis: ${agentResponse.agentResponses
        .map(
          (r) => `${r.agentRole}: ${r.response} (confidence: ${r.confidence})`
        )
        .join("\n")}

Based on the agent insights above, provide a comprehensive response to the user's query.`;

      contextInfo =
        agentResponse.coordinatedInsights || agentResponse.primaryResponse;
    } else if (useRAG) {
      // Use RAG processing for context (simplified for streaming)
      systemPrompt = `You are TaskHQ AI, an intelligent project management assistant with access to relevant project context.

Provide helpful responses to project management queries based on available context.`;

      contextInfo = `Context: Board ${boardId ? `(${boardId})` : "General"}, Task ${taskId ? `(${taskId})` : "All"}`;
    } else {
      // Direct chat without special context
      systemPrompt = `You are a helpful project management assistant. You help users with task management, project planning, and team coordination.

Provide clear, actionable advice based on project management best practices.`;
    }

    // Use streamText for real-time response
    return streamText({
      model: aiConfig.chatModel,
      system: systemPrompt,
      prompt: contextInfo
        ? `Context: ${contextInfo}\n\nQuery: ${query}`
        : query,
      temperature: options?.temperature || 0.7,

      onFinish: async (result) => {
        // Log the completion for analytics
        console.log("Chat completion:", {
          query,
          companyId,
          agentType,
          multiAgent,
          useRAG,
          tokens: result.usage?.totalTokens,
          finishReason: result.finishReason,
        });
      },
    });
  } catch (error) {
    console.error("Streaming error:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "health": {
        const healthStatus = await ragProcessor.healthCheck();

        return NextResponse.json({
          success: true,
          health: healthStatus,
          message: healthStatus.healthy
            ? "RAG system is operational"
            : "RAG system has issues",
        });
      }

      case "stats": {
        const stats = ragProcessor.getProcessingStats();

        return NextResponse.json({
          success: true,
          stats,
        });
      }

      default: {
        return NextResponse.json({
          success: true,
          message: "TaskHQ AI Chat API is ready",
          capabilities: [
            "Semantic task search",
            "Project analysis",
            "Task recommendations",
            "Real-time streaming",
          ],
          supportedContextTypes: [
            "general",
            "task_specific",
            "board_analysis",
            "recommendation",
          ],
        });
      }
    }
  } catch (error) {
    console.error("Chat API GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
