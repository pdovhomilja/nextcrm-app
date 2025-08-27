import { createMcpHandler } from "@vercel/mcp-adapter";
import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod/v3";

// Define schemas separately to help with type inference
const analyticsSchema = {
  boardId: z.string().min(1, "Board ID is required"),
  timeRange: z.enum(["week", "month", "quarter"]).default("month"),
  includeTeamMetrics: z.boolean().default(true),
} as const;

const teamPerformanceSchema = {
  boardId: z.string().optional(),
  timeRange: z.enum(["week", "month", "quarter"]).default("month"),
  includeIndividualMetrics: z.boolean().default(true),
} as const;

const handler = createMcpHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (server: any) => {
    // Analytics and insights tool
    server.tool(
      "analyze_project_health",
      "Analyze project health metrics and performance indicators",
      analyticsSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        try {
          // Get board with tasks and sections
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

          // Get all tasks from board sections and filter by time range
          const allTasks = board.boardSections.flatMap(
            (section) => section.tasks
          );
          const recentTasks = allTasks.filter(
            (task) => new Date(task.createdAt) >= startDate
          );

          // Calculate metrics
          const totalTasks = recentTasks.length;
          const completedTasks = recentTasks.filter(
            (task) => task.status === "COMPLETED"
          ).length;
          const completionRate =
            totalTasks > 0 ? completedTasks / totalTasks : 0;

          // Calculate average task duration for completed tasks
          const completedTasksWithDuration = recentTasks.filter(
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

          // Team metrics
          const teamMetrics = params.includeTeamMetrics
            ? {
                totalMembers: Array.from(
                  new Set(
                    recentTasks.map((task) => task.assignedToId).filter(Boolean)
                  )
                ).length,
                tasksPerMember: recentTasks.reduce(
                  (acc, task) => {
                    if (task.assignedToId) {
                      acc[task.assignedToId] =
                        (acc[task.assignedToId] || 0) + 1;
                    }
                    return acc;
                  },
                  {} as Record<string, number>
                ),
                memberWorkload: recentTasks.reduce(
                  (acc, task) => {
                    if (
                      task.assignedToId &&
                      task.assignedTo &&
                      task.assignedTo.name
                    ) {
                      const memberName = task.assignedTo.name;
                      acc[memberName] = {
                        assigned: (acc[memberName]?.assigned || 0) + 1,
                        completed:
                          (acc[memberName]?.completed || 0) +
                          (task.status === "COMPLETED" ? 1 : 0),
                      };
                    }
                    return acc;
                  },
                  {} as Record<string, { assigned: number; completed: number }>
                ),
              }
            : null;

          // Identify bottlenecks
          const bottlenecks = [];
          const inProgressTasks = recentTasks.filter(
            (task) => task.status === "IN_PROGRESS"
          );
          const avgInProgressDuration =
            inProgressTasks.reduce((sum, task) => {
              const duration =
                now.getTime() - new Date(task.createdAt).getTime();
              return sum + duration;
            }, 0) /
            Math.max(inProgressTasks.length, 1) /
            (1000 * 60 * 60 * 24);

          if (avgInProgressDuration > 7) {
            bottlenecks.push("Tasks staying in progress too long");
          }

          if (completionRate < 0.7) {
            bottlenecks.push("Low task completion rate");
          }

          const result = {
            boardId: params.boardId,
            boardTitle: board.name,
            timeRange: params.timeRange,
            analysisDate: now.toISOString(),
            healthScore: Math.round(completionRate * 100),
            metrics: {
              totalTasks,
              completedTasks,
              completionRate: Math.round(completionRate * 100) / 100,
              avgTaskDuration: Math.round(avgTaskDuration * 10) / 10,
              inProgressTasks: inProgressTasks.length,
              avgInProgressDuration:
                Math.round(avgInProgressDuration * 10) / 10,
            },
            teamMetrics,
            bottlenecks,
            insights: [
              `Completion rate: ${Math.round(completionRate * 100)}%`,
              `Average task duration: ${Math.round(avgTaskDuration * 10) / 10} days`,
              `${inProgressTasks.length} tasks currently in progress`,
              bottlenecks.length > 0
                ? `Attention needed: ${bottlenecks.join(", ")}`
                : "Project health looks good",
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
          console.error("Analytics tool error:", error);
          throw new Error(
            `Analytics analysis failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );

    // Team performance analysis tool
    server.tool(
      "analyze_team_performance",
      "Analyze team member performance and workload distribution",
      teamPerformanceSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
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

          // Get tasks for analysis
          const whereClause = {
            assignedTo: { id: session.user.id },
            createdAt: { gte: startDate },
            ...(params.boardId && {
              board: {
                id: params.boardId,
                access: { has: session.user.id },
              },
            }),
          };

          const tasks = await db.task.findMany({
            where: whereClause,
            include: {
              assignedTo: true,
            },
          });

          // Aggregate team performance
          const teamPerformance = tasks.reduce(
            (acc, task) => {
              if (!task.assignedTo) return acc;

              const userId = task.assignedTo.id;
              const userName = task.assignedTo.name || task.assignedTo.email;

              if (!acc[userId]) {
                acc[userId] = {
                  userName,
                  totalTasks: 0,
                  completedTasks: 0,
                  completionRate: 0,
                  avgCompletionTime: 0,
                  tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
                  tasksByStatus: {
                    NEW: 0,
                    IN_PROGRESS: 0,
                    COMPLETED: 0,
                    CANCELLED: 0,
                    ON_HOLD: 0,
                  },
                };
              }

              acc[userId].totalTasks++;
              acc[userId].tasksByPriority[task.priority]++;
              acc[userId].tasksByStatus[task.status]++;

              if (task.status === "COMPLETED") {
                acc[userId].completedTasks++;
              }

              return acc;
            },
            {} as Record<
              string,
              {
                userName: string;
                totalTasks: number;
                completedTasks: number;
                completionRate: number;
                avgCompletionTime: number;
                tasksByPriority: Record<string, number>;
                tasksByStatus: Record<string, number>;
              }
            >
          );

          // Calculate completion rates and averages
          Object.values(teamPerformance).forEach((member) => {
            member.completionRate =
              member.totalTasks > 0
                ? Math.round(
                    (member.completedTasks / member.totalTasks) * 100
                  ) / 100
                : 0;
          });

          const result = {
            companyId: session.user.activeCompanyId,
            boardId: params.boardId || "all",
            timeRange: params.timeRange,
            analysisDate: now.toISOString(),
            teamOverview: {
              totalMembers: Object.keys(teamPerformance).length,
              totalTasks: tasks.length,
              completedTasks: tasks.filter((t) => t.status === "COMPLETED")
                .length,
              avgTeamCompletionRate:
                Object.values(teamPerformance).reduce(
                  (sum: number, member) => sum + member.completionRate,
                  0
                ) / Math.max(Object.keys(teamPerformance).length, 1),
            },
            memberPerformance: params.includeIndividualMetrics
              ? teamPerformance
              : null,
            insights: generateTeamInsights(teamPerformance, tasks),
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
          console.error("Team performance analysis error:", error);
          throw new Error(
            `Team performance analysis failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );

    interface TeamMember {
      userName: string;
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    }

    function generateTeamInsights(
      teamPerformance: Record<string, TeamMember>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tasks: any[]
    ): string[] {
      const insights = [];
      const members = Object.values(teamPerformance);

      if (members.length === 0) {
        return ["No team member data available for the selected time range"];
      }

      // Find top performer
      const topPerformer = members.reduce((best, current) =>
        current.completionRate > best.completionRate ? current : best
      );
      insights.push(
        `Top performer: ${topPerformer.userName} (${Math.round(topPerformer.completionRate * 100)}% completion rate)`
      );

      // Check for workload imbalance
      const taskCounts = members.map((m) => m.totalTasks);
      const maxTasks = Math.max(...taskCounts);
      const minTasks = Math.min(...taskCounts);

      if (maxTasks > minTasks * 2) {
        insights.push(
          "Workload imbalance detected - consider redistributing tasks"
        );
      }

      // Check for low completion rates
      const lowPerformers = members.filter((m) => m.completionRate < 0.7);
      if (lowPerformers.length > 0) {
        insights.push(
          `${lowPerformers.length} team members have completion rates below 70%`
        );
      }

      // Priority distribution insights
      const highPriorityTasks = tasks.filter(
        (t) => t.priority === "HIGH" || t.priority === "CRITICAL"
      );
      if (highPriorityTasks.length > tasks.length * 0.3) {
        insights.push(
          "High percentage of high-priority tasks - review priority assignments"
        );
      }

      return insights;
    }
  }
);

export { handler as GET, handler as POST };
