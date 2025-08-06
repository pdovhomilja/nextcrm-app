import { createMcpHandler } from "@vercel/mcp-adapter";
import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

const handler = createMcpHandler(async (server) => {
  // Board management tool
  server.tool(
    "get_board_info",
    "Get comprehensive information about a specific board",
    {
      boardId: z.string().min(1, "Board ID is required"),
      includeTaskDetails: z.boolean().default(true),
      includeTeamInfo: z.boolean().default(true),
    },
    async (params) => {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      try {
        const board = await db.board.findFirst({
          where: {
            id: params.boardId,
            access: {
              has: session.user.id,
            },
          },
          include: {
            boardSections: {
              include: {
                tasks: params.includeTaskDetails
                  ? {
                      include: {
                        assignedTo: params.includeTeamInfo,
                      },
                    }
                  : true,
              },
            },
          },
        });

        if (!board) {
          throw new Error("Board not found or access denied");
        }

        // Get all tasks from board sections
        const allTasks = board.boardSections.flatMap(
          (section) => section.tasks
        );

        // Calculate board statistics
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(
          (task) => task.status === "COMPLETED"
        ).length;
        const inProgressTasks = allTasks.filter(
          (task) => task.status === "IN_PROGRESS"
        ).length;
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

        // Priority distribution
        const priorityDistribution = allTasks.reduce(
          (acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Team distribution - temporarily disabled due to missing relation
        const teamDistribution = null;

        const result = {
          boardId: board.id,
          title: board.name,
          description: board.description,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          statistics: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            completionRate: Math.round(completionRate * 100) / 100,
            sectionsCount: board.boardSections.length,
          },
          priorityDistribution,
          teamDistribution,
          sections: board.boardSections.map((section) => ({
            id: section.id,
            title: section.name,
            position: section.position,
            tasksCount: section.tasks.length,
            tasks: params.includeTaskDetails
              ? section.tasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  priority: task.priority,
                  assignedTo: null, // Temporarily disabled due to missing relation
                  createdAt: task.createdAt,
                  updatedAt: task.updatedAt,
                }))
              : undefined,
          })),
          insights: [
            `Board has ${totalTasks} total tasks with ${Math.round(completionRate * 100)}% completion rate`,
            `${inProgressTasks} tasks currently in progress`,
            `Organized in ${board.boardSections.length} sections`,
            Object.keys(priorityDistribution).length > 0
              ? `Priority distribution: ${Object.entries(priorityDistribution)
                  .map(([priority, count]) => `${priority}: ${count}`)
                  .join(", ")}`
              : "No tasks with assigned priorities",
          ],
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Board info tool error:", error);
        throw new Error(
          `Board info retrieval failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  // Board comparison tool
  server.tool(
    "compare_boards",
    "Compare performance and metrics between multiple boards",
    {
      boardIds: z
        .array(z.string())
        .min(2, "At least 2 board IDs required")
        .max(5, "Maximum 5 boards"),
      timeRange: z.enum(["week", "month", "quarter"]).default("month"),
      metrics: z
        .array(
          z.enum([
            "completion_rate",
            "task_count",
            "team_size",
            "avg_task_duration",
          ])
        )
        .default(["completion_rate", "task_count"]),
    },
    async (params) => {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      try {
        // Calculate time range
        const now = new Date();
        const timeRangeMap = {
          week: 7,
          month: 30,
          quarter: 90,
        };
        const daysBack =
          timeRangeMap[params.timeRange as keyof typeof timeRangeMap];
        const startDate = new Date(
          now.getTime() - daysBack * 24 * 60 * 60 * 1000
        );

        // Get boards data
        const boards = await db.board.findMany({
          where: {
            id: { in: params.boardIds },
            access: {
              has: session.user.id,
            },
          },
          include: {
            boardSections: {
              include: {
                tasks: {
                  where: {
                    createdAt: { gte: startDate },
                  },
                  include: {
                    assignedTo: true,
                  },
                },
              },
            },
          },
        });

        if (boards.length === 0) {
          throw new Error("No boards found or access denied");
        }

        // Calculate metrics for each board
        const boardComparisons = boards.map((board) => {
          const allBoardTasks = board.boardSections.flatMap(
            (section) => section.tasks
          );
          const totalTasks = allBoardTasks.length;
          const completedTasks = allBoardTasks.filter(
            (task) => task.status === "COMPLETED"
          ).length;
          const completionRate =
            totalTasks > 0 ? completedTasks / totalTasks : 0;

          // Team size (unique assignees)
          const teamSize = Array.from(
            new Set(
              allBoardTasks.map((task) => task.assignedToId).filter(Boolean)
            )
          ).length;

          // Average task duration for completed tasks
          const completedTasksWithDuration = allBoardTasks.filter(
            (task) =>
              task.status === "COMPLETED" && task.updatedAt && task.createdAt
          );

          const avgTaskDuration =
            completedTasksWithDuration.length > 0
              ? completedTasksWithDuration.reduce((sum, task) => {
                  const duration =
                    new Date(task.updatedAt).getTime() -
                    new Date(task.createdAt).getTime();
                  return sum + duration;
                }, 0) /
                completedTasksWithDuration.length /
                (1000 * 60 * 60 * 24) // Convert to days
              : 0;

          return {
            boardId: board.id,
            title: board.name,
            metrics: {
              completion_rate: Math.round(completionRate * 100) / 100,
              task_count: totalTasks,
              team_size: teamSize,
              avg_task_duration: Math.round(avgTaskDuration * 10) / 10,
            },
          };
        });

        // Find best and worst performers for each metric
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comparison: any = {};
        params.metrics.forEach((metric: string) => {
          const values = boardComparisons.map(
            (b) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (b.metrics as any)[metric]
          );
          const maxValue = Math.max(...values);
          const minValue = Math.min(...values);

          const bestBoard = boardComparisons.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b) => (b.metrics as any)[metric] === maxValue
          );
          const worstBoard = boardComparisons.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b) => (b.metrics as any)[metric] === minValue
          );

          comparison[metric] = {
            best: { board: bestBoard?.title, value: maxValue },
            worst: { board: worstBoard?.title, value: minValue },
            average: values.reduce((sum, val) => sum + val, 0) / values.length,
          };
        });

        const result = {
          comparisonDate: now.toISOString(),
          timeRange: params.timeRange,
          boardCount: boards.length,
          requestedMetrics: params.metrics,
          boardComparisons,
          comparison,
          insights: generateComparisonInsights(
            boardComparisons,
            comparison,
            params.metrics
          ),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Board comparison tool error:", error);
        throw new Error(
          `Board comparison failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  // Board optimization suggestions tool
  server.tool(
    "suggest_board_optimizations",
    "Generate optimization suggestions for a board based on current performance",
    {
      boardId: z.string().min(1, "Board ID is required"),
      focus: z
        .enum(["performance", "team_balance", "workflow", "priorities"])
        .default("performance"),
    },
    async (params) => {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      try {
        const board = await db.board.findFirst({
          where: {
            id: params.boardId,
            access: {
              has: session.user.id,
            },
          },
          include: {
            boardSections: {
              include: {
                tasks: {
                  include: {
                    assignedTo: true,
                  },
                },
              },
            },
          },
        });

        if (!board) {
          throw new Error("Board not found or access denied");
        }

        const suggestions = generateOptimizationSuggestions(
          board,
          params.focus
        );

        const result = {
          boardId: board.id,
          boardTitle: board.name,
          optimizationFocus: params.focus,
          analysisDate: new Date().toISOString(),
          currentMetrics: {
            totalTasks: board.boardSections.flatMap((s) => s.tasks).length,
            completedTasks: board.boardSections
              .flatMap((s) => s.tasks)
              .filter((t) => t.status === "COMPLETED").length,
            sectionsCount: board.boardSections.length,
            teamSize: Array.from(
              new Set(
                board.boardSections
                  .flatMap((s) => s.tasks)
                  .map((t) => t.assignedToId)
                  .filter(Boolean)
              )
            ).length,
          },
          suggestions,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          implementationPriority: suggestions.map((s: any, index) => ({
            priority: index + 1,
            suggestion: s.title,
            estimatedImpact: s.impact,
            complexity: s.complexity,
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Board optimization tool error:", error);
        throw new Error(
          `Board optimization analysis failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  interface BoardComparison {
    boardId: string;
    title: string;
    metrics: Record<string, number>;
  }

  function generateComparisonInsights(
    boardComparisons: BoardComparison[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comparison: any,
    metrics: string[]
  ): string[] {
    const insights = [];

    metrics.forEach((metric) => {
      const data = comparison[metric];
      if (data.best.board !== data.worst.board) {
        insights.push(
          `${metric}: ${data.best.board} leads with ${data.best.value}, while ${data.worst.board} has ${data.worst.value}`
        );
      }
    });

    // Overall performance insight
    const avgCompletionRates = boardComparisons.map(
      (b) => b.metrics.completion_rate
    );
    const overallAvg =
      avgCompletionRates.reduce((sum, rate) => sum + rate, 0) /
      avgCompletionRates.length;
    insights.push(
      `Average completion rate across all boards: ${Math.round(overallAvg * 100)}%`
    );

    return insights;
  }

  interface OptimizationSuggestion {
    title: string;
    description: string;
    impact: string;
    complexity: string;
  }

  function generateOptimizationSuggestions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    board: any,
    focus: string
  ): OptimizationSuggestion[] {
    const suggestions = [];
    const allTasks = board.boardSections.flatMap(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.tasks
    );
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.status === "COMPLETED"
    ).length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    switch (focus) {
      case "performance":
        if (completionRate < 0.7) {
          suggestions.push({
            title: "Improve Task Completion Rate",
            description:
              "Current completion rate is below 70%. Consider breaking down large tasks and setting clearer deadlines.",
            impact: "high",
            complexity: "medium",
          });
        }

        const inProgressTasks = allTasks.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.status === "IN_PROGRESS"
        );
        if (inProgressTasks.length > totalTasks * 0.4) {
          suggestions.push({
            title: "Reduce Work in Progress",
            description:
              "Too many tasks are in progress simultaneously. Consider limiting WIP to improve focus.",
            impact: "medium",
            complexity: "low",
          });
        }
        break;

      case "team_balance":
        const tasksByMember = allTasks.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc: any, task: any) => {
            if (task.assignedToId) {
              acc[task.assignedToId] = (acc[task.assignedToId] || 0) + 1;
            }
            return acc;
          },
          {}
        );

        const taskCounts = Object.values(tasksByMember) as number[];
        if (taskCounts.length > 1) {
          const maxTasks = Math.max(...taskCounts);
          const minTasks = Math.min(...taskCounts);

          if (maxTasks > minTasks * 2) {
            suggestions.push({
              title: "Balance Workload Distribution",
              description:
                "Significant workload imbalance detected. Consider redistributing tasks among team members.",
              impact: "high",
              complexity: "medium",
            });
          }
        }
        break;

      case "workflow":
        // Check for bottlenecks in sections
        const sectionsWithTasks = board.boardSections.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.tasks.length > 0
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sectionsWithTasks.forEach((section: any) => {
          const sectionCompletionRate =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            section.tasks.filter((t: any) => t.status === "COMPLETED").length /
            section.tasks.length;
          if (sectionCompletionRate < 0.5 && section.tasks.length > 5) {
            suggestions.push({
              title: `Optimize "${section.name}" Section`,
              description: `This section has low completion rate (${Math.round(sectionCompletionRate * 100)}%). Review workflow and identify blockers.`,
              impact: "medium",
              complexity: "medium",
            });
          }
        });
        break;

      case "priorities":
        const priorityDistribution = allTasks.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc: any, task: any) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
          },
          {}
        );

        const highPriorityTasks =
          (priorityDistribution.HIGH || 0) +
          (priorityDistribution.CRITICAL || 0);
        if (highPriorityTasks > totalTasks * 0.4) {
          suggestions.push({
            title: "Review Priority Assignments",
            description:
              "Over 40% of tasks are marked as high/critical priority. Consider rebalancing priorities.",
            impact: "medium",
            complexity: "low",
          });
        }
        break;
    }

    // Add general suggestions if no specific ones found
    if (suggestions.length === 0) {
      suggestions.push({
        title: "Board Performance Looks Good",
        description:
          "No immediate optimization opportunities identified. Continue monitoring metrics.",
        impact: "low",
        complexity: "low",
      });
    }

    return suggestions;
  }
});

export { handler as GET, handler as POST };
