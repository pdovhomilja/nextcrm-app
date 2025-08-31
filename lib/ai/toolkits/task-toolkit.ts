import { z } from "zod/v3";
import { tool } from "ai";
import { aiConfig } from "../config";
import { generateObject } from "ai";
import { AgentContext } from "../agent-core";
import db from "@/lib/db";
import { vectorSearchService } from "../vector-search";

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
        // Step 1: Gather data directly from database
        const userTasks = await db.task.findMany({
          where: {
            assignedToId: userId,
            assignedTo: {
              memberships: {
                some: {
                  companyId: context.companyId,
                },
              },
            },
          },
          include: {
            assignedTo: { select: { name: true, email: true } },
            createdBy: { select: { name: true, email: true } },
            boardSection: {
              select: {
                name: true,
                board: { select: { name: true, id: true } },
              },
            },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 20,
        });

        // Get similar tasks using vector search
        const similarTasks = await vectorSearchService.searchTasks({
          query: "task recommendations workload analysis",
          companyId: context.companyId,
          userId: userId,
          limit: 10,
          threshold: 0.5,
        });

        const combinedData = {
          tasks: userTasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            assignedTo: task.assignedTo.name,
            createdBy: task.createdBy.name,
            boardSection: task.boardSection.name,
            boardName: task.boardSection.board.name,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          })),
          similarTasks: similarTasks,
        };

        // Step 2: Generate recommendations.
        const recommendationResult = await generateObject({
          model: aiConfig.structuredOutputModel,
          system: `You are a task recommendation expert. Analyze user workload and project needs to suggest optimal task assignments and priorities.`,
          prompt: `Based on this user's current workload, generate task recommendations:

User data: ${JSON.stringify(combinedData, null, 2)}
Criteria: ${finalCriteria.join(", ")}

Generate specific, actionable recommendations for task management.

Guidelines for workloadAnalysis:
- currentCapacity: Decimal representing workload (0.0 = no work, 1.0 = full capacity, >1.0 = overloaded, max 3.0)
- recommendedTasks: Integer number of additional tasks to assign (0 or positive)
- balanceScore: Decimal from 0.0 to 1.0 representing work-life balance (1.0 = perfect balance)`,
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
                }),
              )
              .max(5),
            workloadAnalysis: z.object({
              currentCapacity: z.number().min(0).max(3), // Allow values > 1 for overload situations
              recommendedTasks: z.number().min(0),
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
