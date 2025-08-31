import { z } from "zod/v3";
import { tool } from "ai";
import { simpleMCPClientPool } from "../simple-mcp-client";
import { aiConfig } from "../config";
import { generateObject } from "ai";
import { AgentContext } from "../agent-core";

export const getResourceToolkit = (context: AgentContext) => ({
  optimizeTeamResources: tool({
    description:
      "Optimizes team resources based on workload, skills, or deadlines.",
    inputSchema: z.object({
      teamIds: z.array(z.string()).describe("The IDs of the teams to analyze."),
      optimizationType: z.enum(["workload", "skills", "deadlines"]),
    }),
    execute: async ({
      teamIds,
      optimizationType,
    }: {
      teamIds: string[];
      optimizationType: "workload" | "skills" | "deadlines";
    }) => {
      console.log(
        `Optimizing resources for teams: ${teamIds.join(
          ", ",
        )} with type: ${optimizationType}`,
      );
      try {
        // Step 1: Gather data.
        const teamData = await simpleMCPClientPool.callTool(
          "tasks",
          "search_tasks",
          { assigneeIds: teamIds, ...context },
          context.userId,
        );

        if (teamData.error) {
          throw new Error(
            `Failed to gather team data. Error: ${teamData.error.message}`,
          );
        }

        // Step 2: Generate optimization recommendations.
        const optimizationResult = await generateObject({
          model: aiConfig.structuredOutputModel,
          system: `You are a resource optimization expert. Analyze team workloads and suggest optimal resource allocation.`,
          prompt: `Optimize team resources based on this data:

Team data: ${JSON.stringify(teamData.result, null, 2)}
Optimization focus: ${optimizationType}
Team members: ${teamIds.join(", ")}

Provide specific resource optimization recommendations.`,
          schema: z.object({
            optimizations: z.array(
              z.object({
                userId: z.string(),
                userName: z.string(),
                currentWorkload: z.number().min(0).max(1),
                recommendedWorkload: z.number().min(0).max(1),
                suggestedReassignments: z.array(
                  z.object({
                    taskId: z.string(),
                    taskTitle: z.string(),
                    fromUser: z.string(),
                    toUser: z.string(),
                    reasoningText: z.string(),
                  }),
                ),
              }),
            ),
            teamMetrics: z.object({
              totalCapacity: z.number(),
              utilizedCapacity: z.number(),
              balanceScore: z.number().min(0).max(1),
              bottlenecks: z.array(z.string()),
            }),
          }),
        });

        return optimizationResult.object;
      } catch (error) {
        console.error("Error in optimizeTeamResources tool:", error);
        return {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during resource optimization.",
        };
      }
    },
  }),
});
