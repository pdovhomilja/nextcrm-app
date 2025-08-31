import { z } from "zod/v3";

import { simpleMCPClientPool } from "../simple-mcp-client";
import { aiConfig } from "../config";
import { generateObject, tool } from "ai";
import { AgentContext } from "../agent-core";

export const getProgressToolkit = (context: AgentContext) => ({
  trackProjectProgress: tool({
    description: "Tracks project progress and provides insights and forecasts.",
    inputSchema: z.object({
      boardId: z.string().describe("The ID of the project board to track."),
      timeRange: z
        .enum(["week", "month", "quarter"])
        .describe("The time range for the analysis."),
    }),
    execute: async ({
      boardId,
      timeRange,
    }: {
      boardId: string;
      timeRange: "week" | "month" | "quarter";
    }) => {
      console.log(`Tracking progress for board ${boardId} over ${timeRange}`);
      try {
        // Step 1: Gather data.
        const progressData = await simpleMCPClientPool.callTool(
          "analytics",
          "analyze_project_health",
          {
            boardId,
            timeRange,
            ...context,
          },
          context.userId,
        );

        if (progressData.error) {
          throw new Error(
            `Failed to gather progress data. Error: ${progressData.error.message}`,
          );
        }

        // Step 2: Generate analysis.
        const progressResult = await generateObject({
          model: aiConfig.structuredOutputModel,
          system: `You are a project progress tracking expert. Analyze project data to provide progress insights and forecasts.`,
          prompt: `Analyze this project progress data:

Data: ${JSON.stringify(progressData.result, null, 2)}
Time range: ${timeRange}

Provide comprehensive progress tracking analysis.`,
          schema: z.object({
            progressSummary: z.object({
              completedTasks: z.number(),
              totalTasks: z.number(),
              completionRate: z.number().min(0).max(1),
              onTrackMilestones: z.number(),
              delayedMilestones: z.number(),
            }),
            trends: z.array(
              z.object({
                metric: z.string(),
                direction: z.enum(["up", "down", "stable"]),
                change: z.number(),
                significance: z.enum(["low", "medium", "high"]),
              }),
            ),
            forecasts: z.object({
              estimatedCompletion: z.string().describe("ISO 8601 date string"),
              confidenceInterval: z.object({
                min: z.string(),
                max: z.string(),
              }),
              riskFactors: z.array(z.string()),
            }),
          }),
        });

        return progressResult.object;
      } catch (error) {
        console.error("Error in trackProjectProgress tool:", error);
        return {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during progress tracking.",
        };
      }
    },
  }),
});
