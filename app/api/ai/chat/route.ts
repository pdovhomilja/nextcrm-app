import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ragProcessor } from "@/lib/ai/rag-processor";
import { validateAIConfig } from "@/lib/ai/config";
import { streamText } from "ai";
import { aiConfig } from "@/lib/ai/config";
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

    if (wantsStream) {
      // Return streaming response
      const streamResult = await streamRAGResponse(
        lastUserMessage.content,
        session.user.cid!,
        session.user.id,
        validatedRequest.boardId,
        validatedRequest.taskId,
        validatedRequest.contextType,
        validatedRequest.options
      );
      return streamResult.toTextStreamResponse();
    } else {
      // Return complete response
      const ragQuery = {
        query: lastUserMessage.content,
        companyId: session.user.cid!,
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
  // ragQuery would be used for context assembly in future enhancement
  // const ragQuery = {
  //   query,
  //   companyId,
  //   userId,
  //   boardId,
  //   taskId,
  //   contextType,
  //   options,
  // };

  try {
    // Use streamText for real-time response
    return streamText({
      model: aiConfig.chatModel,
      system: `You are TaskHQ AI, an intelligent project management assistant. You help users manage tasks, analyze projects, and provide data-driven insights.

Always base your responses on the provided context and be specific about the data you're referencing.`,
      prompt: query,
      temperature: options?.temperature || 0.7,

      onFinish: async (result) => {
        // Log the completion for analytics
        console.log("Chat completion:", {
          query,
          companyId,
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
