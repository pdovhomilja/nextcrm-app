import { generateObject } from "ai";

import { auth } from "@/auth";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { z } from "zod/v3";
import { NextRequest } from "next/server";
import { aiConfig } from "@/lib/ai/config";

const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          "task",
          "assignment",
          "priority",
          "deadline",
          "optimization",
          "communication",
          "feedback",
          "wellness",
          "technology",
          "skill",
          "continuous_improvement",
        ]),
        title: z.string(),
        description: z.string(),
        reasoningText: z.string(),
        confidence: z.number().min(0).max(1),
        impact: z.enum(["low", "medium", "high"]),
        actionable: z.boolean(),
        metadata: z
          .object({
            boardId: z.string().optional(),
            taskId: z.string().optional(),
            userId: z.string().optional(),
            estimatedTime: z.string().optional(),
          })
          .optional(),
      })
    )
    .max(25),
  summary: z.string(),
  contextAnalysis: z.object({
    boardHealth: z.number().min(0).max(100).optional(),
    workloadBalance: z.number().min(0).max(100).optional(), // Allow 0-100 for percentage
    urgentItems: z.number().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      boardId,
      taskId,
      suggestionType = "general",
      context: userContext,
    } = await request.json();

    const activeCompanyId = session.user.activeCompanyId;

    if (!activeCompanyId) {
      return new Response("No company context available", { status: 400 });
    }

    const agentContext = {
      userId: session.user.id,
      companyId: activeCompanyId,
      boardId,
      taskId,
    };

    // Get agent-powered suggestions using the new orchestrator
    let agentSuggestions = "";
    try {
      const agentResponse = await agentOrchestrator.orchestrate({
        query: `Generate actionable suggestions for ${suggestionType} improvement`,
        context: {
          ...agentContext,
          conversationId: `suggest-${session.user.id}-${Date.now()}`,
        },
        history: [],
      });
      agentSuggestions = agentResponse.text;
    } catch (error) {
      console.error("Agent suggestion error:", error);
      agentSuggestions = "Unable to get agent recommendations";
    }

    // Generate structured suggestions
    const result = await generateObject({
      model: aiConfig.structuredOutputModel,
      system: `You are a project management expert that provides actionable suggestions based on current project data and AI agent analysis.

Agent Analysis: ${agentSuggestions}

Generate specific, actionable suggestions that users can implement immediately.

IMPORTANT: For contextAnalysis values:
- boardHealth: 0-100 (percentage)
- workloadBalance: 0-100 (percentage) 
- urgentItems: integer count
- confidence: 0-1 (decimal between 0 and 1)`,
      prompt: `Based on the agent analysis and project context, generate ${suggestionType} suggestions for:
${boardId ? `Board: ${boardId}` : ""}
${taskId ? `Task: ${taskId}` : ""}
${userContext ? `Additional context: ${userContext}` : ""}

Focus on practical, implementable suggestions with clear reasoning.`,
      schema: suggestionSchema,
    });

    return Response.json({
      success: true,
      data: result.object,
      meta: {
        suggestionType,
        timestamp: new Date().toISOString(),
        boardId,
        taskId,
      },
    });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return Response.json(
      { success: false, error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    // Get quick suggestions for the user's current context
    const quickSuggestions = await generateObject({
      model: aiConfig.structuredOutputModel,
      system:
        "Generate quick project management suggestions for the user's current context.",
      prompt: `Generate 3 quick suggestions for project management improvement:
${boardId ? `Board context: ${boardId}` : "General context"}
User: ${session.user.name || session.user.email}`,
      schema: z.object({
        suggestions: z
          .array(
            z.object({
              title: z.string(),
              description: z.string(),
              type: z.enum(["task", "priority", "organization"]),
            })
          )
          .length(3),
      }),
    });

    return Response.json({
      success: true,
      data: quickSuggestions.object,
    });
  } catch (error) {
    console.error("Quick suggestions error:", error);
    return Response.json(
      { success: false, error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
