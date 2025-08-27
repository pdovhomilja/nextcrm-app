import { z } from "zod/v3";
import { tool } from "ai";
import { simpleMCPClientPool } from "../simple-mcp-client";
import { aiConfig } from "../config";
import { generateObject } from "ai";
import { AgentContext } from "../agent-core";

const taskRecommendationsSchema = z.object({
  userId: z
    .string()
    .describe("The ID of the user to generate recommendations for."),
  criteria: z.array(z.string()).optional(),
});

export const getTaskToolkit = (context: AgentContext) => ({
  generateTaskRecommendations: tool({
    description:
      "Generates task recommendations for a user based on their workload and project needs.",
    inputSchema: taskRecommendationsSchema,
    execute: async ({
      userId,
      criteria,
    }: z.infer<typeof taskRecommendationsSchema>) => {
      const finalCriteria = criteria ?? ["priority", "skill_match", "workload"];
      console.log(`Generating task recommendations for user: ${userId}`);
      try {
        // Step 1: Gather data.
        const tasksResult = await simpleMCPClientPool.callTool(
          "tasks",
          "search_tasks",
          { assigneeIds: [userId], ...context },
          context.userId
        );
        const { userId: contextUserId, ...restOfContext } = context;
        const similarTasksResult = await simpleMCPClientPool.callTool(
          "search",
          "find_similar_tasks",
          { userId, ...restOfContext },
          context.userId
        );

        if (tasksResult.error || similarTasksResult.error) {
          throw new Error(
            `Failed to gather user task data. Error: ${
              tasksResult.error?.message || similarTasksResult.error?.message
            }`
          );
        }

        const combinedData = {
          tasks: tasksResult.result,
          similarTasks: similarTasksResult.result,
        };

        // Step 2: Generate recommendations.
        const recommendationResult = await generateObject({
          model: aiConfig.structuredOutputModel,
          system: `You are a task recommendation expert. Analyze user workload and project needs to suggest optimal task assignments and priorities.`,
          prompt: `Based on this user's current workload, generate task recommendations:

User data: ${JSON.stringify(combinedData, null, 2)}
Criteria: ${finalCriteria.join(", ")}

Generate specific, actionable recommendations for task management.`,
          schema: z.object({
            recommendations: z
              .array(
                z.object({
                  type: z.enum([
                    "create_task",
                    "reassign_task",
                    "adjust_priority",
                    "extend_deadline",
                  ]),
                  taskId: z.string().optional(),
                  title: z.string(),
                  description: z.string(),
                  reasoningText: z.string(),
                  confidence: z.number().min(0).max(1),
                  estimatedImpact: z.enum(["low", "medium", "high"]),
                })
              )
              .max(5),
            workloadAnalysis: z.object({
              currentCapacity: z.number().min(0).max(1),
              recommendedTasks: z.number(),
              balanceScore: z.number().min(0).max(1),
            }),
          }),
        });

        return recommendationResult.object;
      } catch (error) {
        console.error("Error in generateTaskRecommendations tool:", error);
        return {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during task recommendation.",
        };
      }
    },
  }),
});
