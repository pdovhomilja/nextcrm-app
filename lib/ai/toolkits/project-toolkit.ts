import { z } from "zod/v3";
import { tool } from "ai";
import { simpleMCPClientPool } from "../simple-mcp-client";
import { aiConfig } from "../config";
import { generateObject } from "ai";
import { AgentContext } from "../agent-core";

export const getProjectToolkit = (context: AgentContext) => ({
  analyzeProjectHealth: tool({
    description:
      "Analyzes the health of a specific project based on metrics like task completion, deadlines, and budget.",
    inputSchema: z.object({
      boardId: z.string().describe("The ID of the project board to analyze."),
    }),
    execute: async ({ boardId }: { boardId: string }) => {
      console.log(`Analyzing project health for board: ${boardId}`);
      try {
        // Step 1: Gather data using underlying MCP tools.
        // This replaces the old internal call to `orchestrateTools`.
        const healthDataPromise = simpleMCPClientPool.callTool(
          "analytics",
          "analyze_project_health",
          { boardId, ...context },
          context.userId
        );
        const { userId: contextUserId, ...restOfContext } = context;
        const tasksDataPromise = simpleMCPClientPool.callTool(
          "search",
          "semantic_search_tasks",
          { boardId, ...restOfContext },
          context.userId
        );

        const [healthResult, tasksResult] = await Promise.all([
          healthDataPromise,
          tasksDataPromise,
        ]);

        if (healthResult.error || tasksResult.error) {
          throw new Error(
            `Failed to gather project data. Health Error: ${healthResult.error?.message}, Tasks Error: ${tasksResult.error?.message}`
          );
        }

        const combinedData = {
          health: healthResult.result,
          tasks: tasksResult.result,
        };

        // Step 2: Use `generateObject` to produce the structured analysis, similar to the original agent.
        const analysisResult = await generateObject({
          model: aiConfig.structuredOutputModel,
          system: `You are a project health analysis expert. Analyze the provided data and generate comprehensive insights.`,
          prompt: `Analyze this project data and provide health assessment:\n\nTool results: ${JSON.stringify(combinedData, null, 2)}\n\nProvide detailed analysis with actionable insights.`,
          schema: z.object({
            healthScore: z.number().min(0).max(100),
            insights: z.array(
              z.object({
                category: z.string(),
                finding: z.string(),
                severity: z.enum(["low", "medium", "high", "critical"]),
                recommendation: z.string(),
              })
            ),
            metrics: z.object({
              completionRate: z.number().min(0).max(1),
              avgTaskDuration: z.number(),
              teamEfficiency: z.number().min(0).max(1),
              bottlenecks: z.array(z.string()),
            }),
          }),
        });

        return analysisResult.object;
      } catch (error) {
        console.error("Error in analyzeProjectHealth tool:", error);
        return {
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during project health analysis.",
        };
      }
    },
  }),
});
