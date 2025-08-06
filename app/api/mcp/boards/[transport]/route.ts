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
            companyId: session.user.cid!,
          },
          include: {
            sections: {
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
            tasks: params.includeTaskDetails
              ? {
                  include: {
                    assignedTo: params.includeTeamInfo,
                  },
                }
              : true,
          },
        });

        if (!board) {
          throw new Error("Board not found or access denied");
        }

        // Calculate board statistics
        const totalTasks = board.tasks.length;
        const completedTasks = board.tasks.filter(
          (task) => task.status === "COMPLETED"
        ).length;
        const inProgressTasks = board.tasks.filter(
          (task) => task.status === "IN_PROGRESS"
        ).length;
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

        // Priority distribution
        const priorityDistribution = board.tasks.reduce(
          (acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Team distribution
        const teamDistribution = params.includeTeamInfo
          ? board.tasks.reduce(
              (acc, task) => {
                if (task.assignedTo) {
                  acc[task.assignedTo.name] =
                    (acc[task.assignedTo.name] || 0) + 1;
                }
                return acc;
              },
              {} as Record<string, number>
            )
          : null;

        const result = {
          boardId: board.id,
          title: board.title,
          description: board.description,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          statistics: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            completionRate: Math.round(completionRate * 100) / 100,
            sectionsCount: board.sections.length,
          },
          priorityDistribution,
          teamDistribution,
          sections: board.sections.map((section) => ({
            id: section.id,
            title: section.title,
            position: section.position,
            tasksCount: section.tasks.length,
            tasks: params.includeTaskDetails
              ? section.tasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  priority: task.priority,
                  assignedTo:
                    params.includeTeamInfo && task.assignedTo
                      ? {
                          id: task.assignedTo.id,
                          name: task.assignedTo.name,
                        }
                      : null,
                  createdAt: task.createdAt,
                  updatedAt: task.updatedAt,
                }))
              : undefined,
          })),
          insights: [
            `Board has ${totalTasks} total tasks with ${Math.round(completionRate * 100)}% completion rate`,
            `${inProgressTasks} tasks currently in progress`,
            `Organized in ${board.sections.length} sections`,
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
        const daysBack = timeRangeMap[params.timeRange];
        const startDate = new Date(
          now.getTime() - daysBack * 24 * 60 * 60 * 1000
        );

        // Get boards data
        const boards = await db.board.findMany({
          where: {
            id: { in: params.boardIds },
            companyId: session.user.cid!,
          },
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
        });

        if (boards.length === 0) {
          throw new Error("No boards found or access denied");
        }

        // Calculate metrics for each board
        const boardComparisons = boards.map((board) => {
          const totalTasks = board.tasks.length;
          const completedTasks = board.tasks.filter(
            (task) => task.status === "COMPLETED"
          ).length;
          const completionRate =
            totalTasks > 0 ? completedTasks / totalTasks : 0;

          // Team size (unique assignees)
          const teamSize = Array.from(
            new Set(
              board.tasks.map((task) => task.assignedToId).filter(Boolean)
            )
          ).length;

          // Average task duration for completed tasks
          const completedTasksWithDuration = board.tasks.filter(
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
            title: board.title,
            metrics: {
              completion_rate: Math.round(completionRate * 100) / 100,
              task_count: totalTasks,
              team_size: teamSize,
              avg_task_duration: Math.round(avgTaskDuration * 10) / 10,
            },
          };
        });

        // Find best and worst performers for each metric
        const comparison = {};
        params.metrics.forEach((metric) => {
          const values = boardComparisons.map((b) => b.metrics[metric]);
          const maxValue = Math.max(...values);
          const minValue = Math.min(...values);

          const bestBoard = boardComparisons.find(
            (b) => b.metrics[metric] === maxValue
          );
          const worstBoard = boardComparisons.find(
            (b) => b.metrics[metric] === minValue
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
            companyId: session.user.cid!,
          },
          include: {
            sections: {
              include: {
                tasks: {
                  include: {
                    assignedTo: true,
                  },
                },
              },
            },
            tasks: {
              include: {
                assignedTo: true,
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
          boardTitle: board.title,
          optimizationFocus: params.focus,
          analysisDate: new Date().toISOString(),
          currentMetrics: {
            totalTasks: board.tasks.length,
            completedTasks: board.tasks.filter((t) => t.status === "COMPLETED")
              .length,
            sectionsCount: board.sections.length,
            teamSize: Array.from(
              new Set(board.tasks.map((t) => t.assignedToId).filter(Boolean))
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function generateOptimizationSuggestions(
    board: any,
    focus: string
  ): OptimizationSuggestion[] {
    const suggestions = [];
    const totalTasks = board.tasks.length;
    const completedTasks = board.tasks.filter(
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

        const inProgressTasks = board.tasks.filter(
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
        const tasksByMember = board.tasks.reduce(
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sectionsWithTasks = board.sections.filter(
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
              title: `Optimize "${section.title}" Section`,
              description: `This section has low completion rate (${Math.round(sectionCompletionRate * 100)}%). Review workflow and identify blockers.`,
              impact: "medium",
              complexity: "medium",
            });
          }
        });
        break;

      case "priorities":
        const priorityDistribution = board.tasks.reduce(
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

export const { GET, POST } = handler;
