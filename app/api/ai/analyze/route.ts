import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { z } from "zod";
import { NextRequest } from "next/server";

const analysisSchema = z.object({
  overview: z.object({
    summary: z.string(),
    healthScore: z.number().min(0).max(100),
    status: z.enum(["excellent", "good", "fair", "poor", "critical"]),
    lastAnalyzed: z.string(),
  }),
  insights: z
    .array(
      z.object({
        category: z.enum([
          "performance",
          "workload",
          "timeline",
          "quality",
          "resources",
        ]),
        title: z.string(),
        finding: z.string(),
        severity: z.enum(["info", "low", "medium", "high", "critical"]),
        recommendation: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(8),
  metrics: z.object({
    completionRate: z.number().min(0).max(1),
    averageTaskDuration: z.number(),
    teamEfficiency: z.number().min(0).max(1),
    bottlenecks: z.array(z.string()).max(5),
    upcomingDeadlines: z.number(),
    overdueTasks: z.number(),
  }),
  trends: z
    .array(
      z.object({
        metric: z.string(),
        direction: z.enum(["improving", "stable", "declining"]),
        change: z.number(),
        timeframe: z.string(),
      })
    )
    .max(5),
  recommendations: z
    .array(
      z.object({
        priority: z.enum(["low", "medium", "high", "critical"]),
        action: z.string(),
        reasoning: z.string(),
        expectedImpact: z.string(),
      })
    )
    .max(6),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      boardId,
      analysisType = "comprehensive",
      timeRange = "month",
    } = await request.json();

    // const agentContext = {
    //   userId: session.user.id,
    //   companyId: session.user.cid!,
    //   boardId,
    // };

    // Get analysis from specialized agent
    // const analyzer = await AgentFactory.getAgent("analyzer");

    // Stream the analysis as it's generated
    const result = await streamObject({
      model: openai("gpt-4-turbo"),
      system: `You are a project analytics expert providing real-time insights and analysis.

Generate comprehensive project analysis with actionable insights and recommendations.

Current timestamp: ${new Date().toISOString()}
Analysis scope: ${analysisType}
Time range: ${timeRange}`,
      prompt: `Perform ${analysisType} analysis for project:
${boardId ? `Board ID: ${boardId}` : "Company-wide analysis"}

Provide detailed insights covering:
1. Project health and performance
2. Team workload and efficiency  
3. Timeline and milestone progress
4. Resource utilization
5. Risk factors and bottlenecks
6. Actionable recommendations

Focus on data-driven insights with specific metrics where possible.`,
      schema: analysisSchema,
      temperature: 0.4, // Lower temperature for more consistent analysis
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Analysis API error:", error);
    return new Response(JSON.stringify({ error: "Analysis failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get quick analysis summary

    const quickAnalysis = {
      healthScore: 75, // This would come from actual analysis
      status: "good" as const,
      keyMetrics: {
        completionRate: 0.68,
        overdueTasks: 3,
        teamEfficiency: 0.82,
      },
      topInsight:
        "Team velocity is improving but there are 3 overdue high-priority tasks requiring attention.",
      lastUpdated: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      data: quickAnalysis,
    });
  } catch (error) {
    console.error("Quick analysis error:", error);
    return Response.json(
      { success: false, error: "Analysis unavailable" },
      { status: 500 }
    );
  }
}
