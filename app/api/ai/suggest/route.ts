import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { AgentFactory } from "@/lib/ai/specialized-agents";
import { z } from "zod";
import { NextRequest } from "next/server";

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
        ]),
        title: z.string(),
        description: z.string(),
        reasoning: z.string(),
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
    .max(5),
  summary: z.string(),
  contextAnalysis: z.object({
    boardHealth: z.number().min(0).max(100).optional(),
    workloadBalance: z.number().min(0).max(1).optional(),
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

    const agentContext = {
      userId: session.user.id,
      companyId: session.user.cid!,
      boardId,
      taskId,
    };

    // Use appropriate agent based on suggestion type
    let agentType: "analyzer" | "recommender" | "tracker" | "optimizer";

    switch (suggestionType) {
      case "optimization":
        agentType = "optimizer";
        break;
      case "progress":
        agentType = "tracker";
        break;
      case "analysis":
        agentType = "analyzer";
        break;
      default:
        agentType = "recommender";
    }

    // Get agent-powered suggestions
    const agent = await AgentFactory.getAgent(agentType);

    let agentSuggestions = "";
    try {
      const agentResponse = await agent.processQuery(
        `Generate actionable suggestions for ${suggestionType} improvement`,
        agentContext
      );
      agentSuggestions = agentResponse.response;
    } catch (error) {
      console.error("Agent suggestion error:", error);
      agentSuggestions = "Unable to get agent recommendations";
    }

    // Generate structured suggestions
    const result = await generateObject({
      model: openai("gpt-4-turbo"),
      system: `You are a project management expert that provides actionable suggestions based on current project data and AI agent analysis.

Agent Analysis: ${agentSuggestions}

Generate specific, actionable suggestions that users can implement immediately.`,
      prompt: `Based on the agent analysis and project context, generate ${suggestionType} suggestions for:
${boardId ? `Board: ${boardId}` : ""}
${taskId ? `Task: ${taskId}` : ""}
${userContext ? `Additional context: ${userContext}` : ""}

Focus on practical, implementable suggestions with clear reasoning.`,
      schema: suggestionSchema,
      temperature: 0.6,
    });

    return Response.json({
      success: true,
      data: result.object,
      meta: {
        agentType,
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
      model: openai("gpt-4-turbo"),
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
      temperature: 0.7,
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
