import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod/v3";
import { getMcpUser } from "@/lib/ai/mcp-transport-auth";
import db from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";
import {
  verifyTaskAccess,
  verifyBoardAccess,
  verifyBoardDeleteAccess,
  verifySectionAccess,
} from "@/lib/security/company-access-validator";
import { vectorSearchService } from "@/lib/ai/vector-search";

// ── Task schemas ──────────────────────────────────────────────────────────────

const createTaskSchema = {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  boardSectionId: z.string().min(1, "Board section ID is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
} as const;

const searchTasksSchema = {
  searchTerm: z.string().optional(),
  boardId: z.string().optional(),
  status: z
    .array(z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]))
    .optional(),
  priority: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])).optional(),
  assigneeIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).default(10),
} as const;

const updateTaskSchema = {
  taskId: z.string().min(1, "Task ID is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z
    .enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
    .optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
} as const;

// ── Board schemas ─────────────────────────────────────────────────────────────

const getBoardInfoSchema = {
  boardId: z.string().min(1, "Board ID is required"),
  includeTaskDetails: z.boolean().default(true),
  includeTeamInfo: z.boolean().default(true),
} as const;

const compareBoardsSchema = {
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
      ]),
    )
    .default(["completion_rate", "task_count"]),
} as const;

const suggestOptimizationsSchema = {
  boardId: z.string().min(1, "Board ID is required"),
  focus: z
    .enum(["performance", "team_balance", "workflow", "priorities"])
    .default("performance"),
} as const;

// ── Analytics schemas ─────────────────────────────────────────────────────────

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

// ── Helper types & functions ──────────────────────────────────────────────────

interface BoardComparison {
  boardId: string;
  title: string;
  metrics: Record<string, number>;
}

function generateComparisonInsights(
  boardComparisons: BoardComparison[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comparison: any,
  metrics: string[],
): string[] {
  const insights = [];

  metrics.forEach((metric) => {
    const data = comparison[metric];
    if (data.best.board !== data.worst.board) {
      insights.push(
        `${metric}: ${data.best.board} leads with ${data.best.value}, while ${data.worst.board} has ${data.worst.value}`,
      );
    }
  });

  const avgCompletionRates = boardComparisons.map(
    (b) => b.metrics.completion_rate,
  );
  const overallAvg =
    avgCompletionRates.reduce((sum, rate) => sum + rate, 0) /
    avgCompletionRates.length;
  insights.push(
    `Average completion rate across all boards: ${Math.round(overallAvg * 100)}%`,
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
  focus: string,
): OptimizationSuggestion[] {
  const suggestions = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks = board.boardSections.flatMap((s: any) => s.tasks);
  const totalTasks = allTasks.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedTasks = allTasks.filter((t: any) => t.status === "COMPLETED").length;
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

      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inProgressTasks = allTasks.filter((t: any) => t.status === "IN_PROGRESS");
        if (inProgressTasks.length > totalTasks * 0.4) {
          suggestions.push({
            title: "Reduce Work in Progress",
            description:
              "Too many tasks are in progress simultaneously. Consider limiting WIP to improve focus.",
            impact: "medium",
            complexity: "low",
          });
        }
      }
      break;

    case "team_balance": {
      const tasksByMember = allTasks.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: any, task: any) => {
          if (task.assignedToId) {
            acc[task.assignedToId] = (acc[task.assignedToId] || 0) + 1;
          }
          return acc;
        },
        {},
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
    }

    case "workflow": {
      const sectionsWithTasks = board.boardSections.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.tasks.length > 0,
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
    }

    case "priorities": {
      const priorityDistribution = allTasks.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: any, task: any) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        },
        {},
      );
      const highPriorityTasks =
        (priorityDistribution.HIGH || 0) + (priorityDistribution.CRITICAL || 0);
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
  }

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

interface TeamMember {
  userName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

function generateTeamInsights(
  teamPerformance: Record<string, TeamMember>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[],
): string[] {
  const insights = [];
  const members = Object.values(teamPerformance);

  if (members.length === 0) {
    return ["No team member data available for the selected time range"];
  }

  const topPerformer = members.reduce((best, current) =>
    current.completionRate > best.completionRate ? current : best,
  );
  insights.push(
    `Top performer: ${topPerformer.userName} (${Math.round(topPerformer.completionRate * 100)}% completion rate)`,
  );

  const taskCounts = members.map((m) => m.totalTasks);
  const maxTasks = Math.max(...taskCounts);
  const minTasks = Math.min(...taskCounts);
  if (maxTasks > minTasks * 2) {
    insights.push("Workload imbalance detected - consider redistributing tasks");
  }

  const lowPerformers = members.filter((m) => m.completionRate < 0.7);
  if (lowPerformers.length > 0) {
    insights.push(
      `${lowPerformers.length} team members have completion rates below 70%`,
    );
  }

  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "HIGH" || t.priority === "CRITICAL",
  );
  if (highPriorityTasks.length > tasks.length * 0.3) {
    insights.push(
      "High percentage of high-priority tasks - review priority assignments",
    );
  }

  return insights;
}

// ── MCP handler ───────────────────────────────────────────────────────────────

const handler = createMcpHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (server: any) => {
    // ── Base tools ──────────────────────────────────────────────────────────

    server.tool(
      "health_check",
      "Check server health and connectivity",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                server: "taskhq-mcp",
                features: {
                  aiEnabled: process.env.AI_FEATURES_ENABLED === "true",
                  mcpEnabled: process.env.MCP_TOOLS_ENABLED === "true",
                  pgvectorEnabled: process.env.PGVECTOR_ENABLED === "true",
                },
              }),
            },
          ],
        };
      },
    );

    server.tool(
      "server_info",
      "Get server configuration and capabilities",
      {},
      async () => {
        let userId: string | null = null;
        let companyId: string | null = null;
        try {
          const mcpUser = await getMcpUser();
          userId = mcpUser.id;
          companyId = mcpUser.companyId;
        } catch {
          // unauthenticated — still return server info
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  serverName: "TaskHQ MCP Server",
                  version: "2.0.0",
                  authenticated: !!userId,
                  userId,
                  companyId,
                  capabilities: [
                    "health_check",
                    "server_info",
                    "create_task",
                    "search_tasks",
                    "update_task",
                    "get_task",
                    "delete_task",
                    "mark_task_done",
                    "move_task",
                    "get_board_info",
                    "compare_boards",
                    "suggest_board_optimizations",
                    "list_boards",
                    "create_board",
                    "edit_board",
                    "delete_board",
                    "list_board_sections",
                    "create_board_section",
                    "delete_board_section",
                    "semantic_search_tasks",
                    "hybrid_search",
                    "get_embedding_status",
                    "search_boards",
                    "find_similar_tasks",
                    "vector_search_health",
                    "analyze_project_health",
                    "analyze_team_performance",
                  ],
                  environment: {
                    nodeEnv: process.env.NODE_ENV,
                    aiModel: process.env.AI_MODEL,
                    embeddingModel: process.env.EMBEDDING_MODEL,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ── Task tools ──────────────────────────────────────────────────────────

    server.tool(
      "create_task",
      "Create a new task in the specified board section",
      createTaskSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const task = await db.task.create({
            data: {
              title: params.title,
              description: params.description || "",
              boardSectionId: params.boardSectionId,
              priority: params.priority,
              status: "NEW",
              createdById: mcpUser.id,
              assignedToId: params.assigneeIds?.[0] || mcpUser.id,
              dueDate: params.dueDate
                ? new Date(params.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              position: 0,
            },
            include: {
              assignedTo: true,
              createdBy: true,
              boardSection: {
                include: { board: true },
              },
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    task: {
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      status: task.status,
                      boardName: task.boardSection.board.name,
                      sectionName: task.boardSection.name,
                      assignedTo: task.assignedTo.name,
                      createdBy: task.createdBy.name,
                      createdAt: task.createdAt,
                      dueDate: task.dueDate,
                    },
                    message: `Task "${task.title}" created successfully`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "search_tasks",
      "Search and filter tasks with semantic and traditional search",
      searchTasksSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const whereClause: Prisma.TaskWhereInput = {
            boardSection: {
              board: {
                access: { has: mcpUser.id },
              },
            },
          };

          if (params.boardId) {
            whereClause.boardSection!.boardId = params.boardId;
          }
          if (params.status?.length) {
            whereClause.status = { in: params.status };
          }
          if (params.priority?.length) {
            whereClause.priority = { in: params.priority };
          }
          if (params.assigneeIds?.length) {
            whereClause.assignedToId = { in: params.assigneeIds };
          }
          if (params.searchTerm) {
            whereClause.OR = [
              { title: { contains: params.searchTerm, mode: "insensitive" } },
              { description: { contains: params.searchTerm, mode: "insensitive" } },
            ];
          }

          const tasks = await db.task.findMany({
            where: whereClause,
            take: params.limit,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            include: {
              assignedTo: true,
              createdBy: true,
              boardSection: { include: { board: true } },
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    results: tasks.map((task) => ({
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      status: task.status,
                      dueDate: task.dueDate,
                      boardName: task.boardSection.board.name,
                      sectionName: task.boardSection.name,
                      assignedTo: task.assignedTo.name,
                      createdBy: task.createdBy.name,
                      createdAt: task.createdAt,
                      updatedAt: task.updatedAt,
                    })),
                    totalResults: tasks.length,
                    searchTerm: params.searchTerm,
                    filters: {
                      boardId: params.boardId,
                      status: params.status,
                      priority: params.priority,
                      assigneeIds: params.assigneeIds,
                    },
                    message: `Found ${tasks.length} tasks matching criteria`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to search tasks: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "update_task",
      "Update an existing task",
      updateTaskSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          await verifyTaskAccess(params.taskId, mcpUser.id, mcpUser.companyId);
          const updateData: Prisma.TaskUpdateInput = {};
          if (params.title) updateData.title = params.title;
          if (params.description !== undefined) updateData.description = params.description;
          if (params.priority) updateData.priority = params.priority;
          if (params.status) updateData.status = params.status;
          if (params.assignedToId)
            updateData.assignedTo = { connect: { id: params.assignedToId } };
          if (params.dueDate) updateData.dueDate = new Date(params.dueDate);

          const task = await db.task.update({
            where: { id: params.taskId },
            data: updateData,
            include: {
              assignedTo: true,
              createdBy: true,
              boardSection: { include: { board: true } },
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    task: {
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      status: task.status,
                      dueDate: task.dueDate,
                      boardName: task.boardSection.board.name,
                      sectionName: task.boardSection.name,
                      assignedTo: task.assignedTo.name,
                      updatedAt: task.updatedAt,
                    },
                    message: `Task "${task.title}" updated successfully`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "get_task",
      "Get a single task by ID with full details",
      { taskId: z.string().min(1, "Task ID is required") } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const task = await verifyTaskAccess(
          params.taskId,
          mcpUser.id,
          mcpUser.companyId,
        );

        const full = await db.task.findUnique({
          where: { id: task.id },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
            boardSection: {
              include: { board: { select: { id: true, name: true } } },
            },
            history: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, task: full }, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "delete_task",
      "Delete a task (must have access to the task's board)",
      { taskId: z.string().min(1, "Task ID is required") } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        await verifyTaskAccess(params.taskId, mcpUser.id, mcpUser.companyId);
        await db.task.delete({ where: { id: params.taskId } });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Task ${params.taskId} deleted`,
              }),
            },
          ],
        };
      },
    );

    server.tool(
      "mark_task_done",
      "Set task status to COMPLETED",
      { taskId: z.string().min(1, "Task ID is required") } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        await verifyTaskAccess(params.taskId, mcpUser.id, mcpUser.companyId);

        const task = await db.task.update({
          where: { id: params.taskId },
          data: { status: "COMPLETED" },
          include: {
            boardSection: {
              include: { board: { select: { id: true, name: true } } },
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                  },
                  message: `Task "${task.title}" marked as completed`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "move_task",
      "Move a task to a different board section (optionally set position)",
      {
        taskId: z.string().min(1, "Task ID is required"),
        targetSectionId: z.string().min(1, "Target section ID is required"),
        targetPosition: z.number().optional(),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        await verifyTaskAccess(params.taskId, mcpUser.id, mcpUser.companyId);

        const task = await db.task.update({
          where: { id: params.taskId },
          data: {
            boardSectionId: params.targetSectionId,
            position: params.targetPosition ?? 0,
          },
          include: {
            boardSection: {
              include: { board: { select: { id: true, name: true } } },
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    sectionName: task.boardSection.name,
                    position: task.position,
                  },
                  message: `Task "${task.title}" moved to "${task.boardSection.name}"`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ── Board tools ─────────────────────────────────────────────────────────

    server.tool(
      "get_board_info",
      "Get comprehensive information about a specific board",
      getBoardInfoSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const board = await db.board.findFirst({
            where: {
              id: params.boardId,
              access: { has: mcpUser.id },
            },
            include: {
              boardSections: {
                include: {
                  tasks: params.includeTaskDetails
                    ? { include: { assignedTo: params.includeTeamInfo } }
                    : true,
                },
              },
            },
          });

          if (!board) {
            throw new Error("Board not found or access denied");
          }

          const allTasks = board.boardSections.flatMap((section) => section.tasks);
          const totalTasks = allTasks.length;
          const completedTasks = allTasks.filter((task) => task.status === "COMPLETED").length;
          const inProgressTasks = allTasks.filter((task) => task.status === "IN_PROGRESS").length;
          const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

          const priorityDistribution = allTasks.reduce(
            (acc, task) => {
              acc[task.priority] = (acc[task.priority] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

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
            teamDistribution: null,
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
                    assignedTo: null,
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
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw new Error(
            `Board info retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "compare_boards",
      "Compare performance and metrics between multiple boards",
      compareBoardsSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const now = new Date();
          const timeRangeMap = { week: 7, month: 30, quarter: 90 };
          const daysBack = timeRangeMap[params.timeRange as keyof typeof timeRangeMap];
          const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

          const boards = await db.board.findMany({
            where: {
              id: { in: params.boardIds },
              access: { has: mcpUser.id },
            },
            include: {
              boardSections: {
                include: {
                  tasks: {
                    where: { createdAt: { gte: startDate } },
                    include: { assignedTo: true },
                  },
                },
              },
            },
          });

          if (boards.length === 0) {
            throw new Error("No boards found or access denied");
          }

          const boardComparisons = boards.map((board) => {
            const allBoardTasks = board.boardSections.flatMap((section) => section.tasks);
            const totalTasks = allBoardTasks.length;
            const completedTasks = allBoardTasks.filter((task) => task.status === "COMPLETED").length;
            const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
            const teamSize = Array.from(
              new Set(allBoardTasks.map((task) => task.assignedToId).filter(Boolean)),
            ).length;
            const completedTasksWithDuration = allBoardTasks.filter(
              (task) => task.status === "COMPLETED" && task.updatedAt && task.createdAt,
            );
            const avgTaskDuration =
              completedTasksWithDuration.length > 0
                ? completedTasksWithDuration.reduce((sum, task) => {
                    return (
                      sum +
                      (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime())
                    );
                  }, 0) /
                  completedTasksWithDuration.length /
                  (1000 * 60 * 60 * 24)
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const comparison: any = {};
          params.metrics.forEach((metric: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const values = boardComparisons.map((b) => (b.metrics as any)[metric]);
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            const bestBoard = boardComparisons.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (b) => (b.metrics as any)[metric] === maxValue,
            );
            const worstBoard = boardComparisons.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (b) => (b.metrics as any)[metric] === minValue,
            );
            comparison[metric] = {
              best: { board: bestBoard?.title, value: maxValue },
              worst: { board: worstBoard?.title, value: minValue },
              average: values.reduce((sum: number, val: number) => sum + val, 0) / values.length,
            };
          });

          const result = {
            comparisonDate: now.toISOString(),
            timeRange: params.timeRange,
            boardCount: boards.length,
            requestedMetrics: params.metrics,
            boardComparisons,
            comparison,
            insights: generateComparisonInsights(boardComparisons, comparison, params.metrics),
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw new Error(
            `Board comparison failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "suggest_board_optimizations",
      "Generate optimization suggestions for a board based on current performance",
      suggestOptimizationsSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const board = await db.board.findFirst({
            where: {
              id: params.boardId,
              access: { has: mcpUser.id },
            },
            include: {
              boardSections: {
                include: { tasks: { include: { assignedTo: true } } },
              },
            },
          });

          if (!board) {
            throw new Error("Board not found or access denied");
          }

          const suggestions = generateOptimizationSuggestions(board, params.focus);

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
                    .filter(Boolean),
                ),
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
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw new Error(
            `Board optimization analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "list_boards",
      "List boards the authenticated user has access to",
      {
        query: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {
          companyId: mcpUser.companyId,
          access: { has: mcpUser.id },
        };
        if (params.query) {
          where.OR = [
            { name: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
          ];
        }

        const boards = await db.board.findMany({
          where,
          take: params.limit,
          orderBy: { updatedAt: "desc" },
          include: {
            boardSections: {
              include: { _count: { select: { tasks: true } } },
              orderBy: { position: "asc" },
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  boards: boards.map((b) => ({
                    id: b.id,
                    name: b.name,
                    description: b.description,
                    createdAt: b.createdAt,
                    updatedAt: b.updatedAt,
                    sections: b.boardSections.map((s) => ({
                      id: s.id,
                      name: s.name,
                      position: s.position,
                      taskCount: s._count.tasks,
                    })),
                    totalTasks: b.boardSections.reduce((sum, s) => sum + s._count.tasks, 0),
                  })),
                  count: boards.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "create_board",
      "Create a new board with optional default sections",
      {
        name: z.string().min(1, "Board name is required"),
        description: z.string().optional(),
        withTemplate: z.boolean().default(true),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const board = await db.board.create({
          data: {
            name: params.name,
            description: params.description || "",
            createdBy: mcpUser.id,
            companyId: mcpUser.companyId,
            access: [mcpUser.id],
            ...(params.withTemplate
              ? {
                  boardSections: {
                    create: [
                      { name: "To Do", position: 0 },
                      { name: "In Progress", position: 1 },
                      { name: "Done", position: 2 },
                    ],
                  },
                }
              : {}),
          },
          include: {
            boardSections: { orderBy: { position: "asc" } },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  board: {
                    id: board.id,
                    name: board.name,
                    description: board.description,
                    sections: board.boardSections.map((s) => ({
                      id: s.id,
                      name: s.name,
                      position: s.position,
                    })),
                  },
                  message: `Board "${board.name}" created successfully`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "edit_board",
      "Update board name and/or description",
      {
        boardId: z.string().min(1),
        name: z.string().optional(),
        description: z.string().optional(),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();
        await verifyBoardAccess(params.boardId, mcpUser.id, mcpUser.companyId);

        const board = await db.board.update({
          where: { id: params.boardId },
          data: {
            ...(params.name !== undefined && { name: params.name }),
            ...(params.description !== undefined && { description: params.description }),
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  board: { id: board.id, name: board.name, description: board.description },
                  message: `Board "${board.name}" updated`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "delete_board",
      "Delete a board (creator or company admin only)",
      { boardId: z.string().min(1) } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();
        await verifyBoardDeleteAccess(params.boardId, mcpUser.id, mcpUser.companyId);

        const sections = await db.boardSection.findMany({
          where: { boardId: params.boardId },
          select: { id: true },
        });
        const sectionIds = sections.map((s) => s.id);
        await db.task.deleteMany({ where: { boardSectionId: { in: sectionIds } } });
        await db.boardSection.deleteMany({ where: { boardId: params.boardId } });
        await db.board.delete({ where: { id: params.boardId } });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Board ${params.boardId} deleted`,
              }),
            },
          ],
        };
      },
    );

    server.tool(
      "list_board_sections",
      "List sections of a board with task counts",
      { boardId: z.string().min(1) } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();
        await verifyBoardAccess(params.boardId, mcpUser.id, mcpUser.companyId);

        const sections = await db.boardSection.findMany({
          where: { boardId: params.boardId },
          include: { _count: { select: { tasks: true } } },
          orderBy: { position: "asc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  boardId: params.boardId,
                  sections: sections.map((s) => ({
                    id: s.id,
                    name: s.name,
                    position: s.position,
                    taskCount: s._count.tasks,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "create_board_section",
      "Add a new section (column) to a board",
      {
        boardId: z.string().min(1),
        name: z.string().min(1, "Section name is required"),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();
        await verifyBoardAccess(params.boardId, mcpUser.id, mcpUser.companyId);

        const maxPos = await db.boardSection.aggregate({
          where: { boardId: params.boardId },
          _max: { position: true },
        });

        const section = await db.boardSection.create({
          data: {
            name: params.name,
            boardId: params.boardId,
            position: (maxPos._max.position ?? -1) + 1,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  section: { id: section.id, name: section.name, position: section.position },
                  message: `Section "${section.name}" created`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "delete_board_section",
      "Delete an empty board section",
      {
        sectionId: z.string().min(1),
        boardId: z.string().min(1),
      } as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();
        const section = await verifySectionAccess(
          params.sectionId,
          mcpUser.id,
          mcpUser.companyId,
        );

        const taskCount = await db.task.count({
          where: { boardSectionId: section.id },
        });
        if (taskCount > 0) {
          throw new Error(
            `Cannot delete section "${section.name}" — it still contains ${taskCount} task(s). Move or delete them first.`,
          );
        }

        await db.boardSection.delete({ where: { id: section.id } });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Section "${section.name}" deleted`,
              }),
            },
          ],
        };
      },
    );

    // ── Search tools ────────────────────────────────────────────────────────

    server.tool(
      "semantic_search_tasks",
      "Perform semantic search using vector embeddings",
      {
        query: z.string().min(1, "Query is required"),
        threshold: z.number().min(0).max(1).default(0.7),
        limit: z.number().min(1).max(50).default(10),
        filters: z
          .object({
            boardIds: z.array(z.string()).optional(),
            priority: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])).optional(),
            status: z
              .array(
                z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
              )
              .optional(),
            assigneeIds: z.array(z.string()).optional(),
            dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
          })
          .optional(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const searchQuery = {
          query: params.query,
          companyId: mcpUser.companyId!,
          userId: mcpUser.id,
          threshold: params.threshold,
          limit: params.limit,
          filters: params.filters
            ? {
                ...params.filters,
                dateRange: params.filters.dateRange
                  ? {
                      start: new Date(params.filters.dateRange.start),
                      end: new Date(params.filters.dateRange.end),
                    }
                  : undefined,
              }
            : undefined,
        };

        const results = await vectorSearchService.searchTasks(searchQuery);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  results: results.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100,
                  })),
                  resultCount: results.length,
                  searchType: "semantic-vector",
                  threshold: params.threshold,
                  message: `Found ${results.length} semantically similar tasks`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "hybrid_search",
      "Perform hybrid search combining semantic and keyword matching",
      {
        query: z.string().min(1, "Query is required"),
        vectorWeight: z.number().min(0).max(1).default(0.7),
        keywordWeight: z.number().min(0).max(1).default(0.3),
        limit: z.number().min(1).max(20).default(10),
        filters: z
          .object({
            boardId: z.string().optional(),
            priority: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])).optional(),
            status: z
              .array(
                z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
              )
              .optional(),
          })
          .optional(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        if (!mcpUser.companyId) {
          throw new Error("Company context required");
        }

        const searchQuery = {
          query: params.query,
          companyId: mcpUser.companyId!,
          userId: mcpUser.id,
          limit: params.limit,
          filters: params.filters
            ? {
                boardIds: params.filters.boardId ? [params.filters.boardId] : undefined,
                priority: params.filters.priority,
                status: params.filters.status,
              }
            : undefined,
        };

        const results = await vectorSearchService.hybridSearch(
          searchQuery,
          params.vectorWeight,
          params.keywordWeight,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  searchWeights: { vector: params.vectorWeight, keyword: params.keywordWeight },
                  results: results.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100,
                  })),
                  resultCount: results.length,
                  searchType: "hybrid",
                  filters: params.filters,
                  message: `Found ${results.length} relevant tasks using hybrid search`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "get_embedding_status",
      "Check the status of task and board embeddings",
      { boardId: z.string().optional() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const taskEmbeddingCount = await db.taskEmbedding.count();
        const boardEmbeddingCount = await db.boardEmbedding.count();

        let boardSpecificCount = 0;
        if (params.boardId) {
          boardSpecificCount = await db.taskEmbedding.count({
            where: {
              task: {
                boardSection: {
                  boardId: params.boardId,
                  board: { access: { has: mcpUser.id } },
                },
              },
            },
          });
        }

        const availableTasks = await db.task.count({
          where: {
            boardSection: { board: { access: { has: mcpUser.id } } },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  embeddings: {
                    totalTaskEmbeddings: taskEmbeddingCount,
                    totalBoardEmbeddings: boardEmbeddingCount,
                    boardSpecificTaskEmbeddings: params.boardId ? boardSpecificCount : null,
                    availableTasksForEmbedding: availableTasks,
                    embeddingCoverage:
                      availableTasks > 0
                        ? ((taskEmbeddingCount / availableTasks) * 100).toFixed(1) + "%"
                        : "0%",
                  },
                  vectorSearchCapability: {
                    enabled: process.env.PGVECTOR_ENABLED === "true",
                    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
                    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
                  },
                  status: taskEmbeddingCount > 0 ? "embeddings-available" : "embeddings-pending",
                  message:
                    taskEmbeddingCount > 0
                      ? "Embeddings are available for semantic search"
                      : "No embeddings found. Run embedding generation first.",
                  recommendations:
                    taskEmbeddingCount === 0
                      ? [
                          "Enable pgvector extension in your PostgreSQL database",
                          "Run embedding generation for existing tasks",
                          "Configure OpenAI API key for embedding generation",
                        ]
                      : [
                          "Vector search is ready to use",
                          "Consider batch updating embeddings for better performance",
                        ],
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "search_boards",
      "Search and filter boards accessible to the user",
      {
        query: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = { access: { has: mcpUser.id } };
        if (params.query) {
          whereClause.OR = [
            { name: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
          ];
        }

        const boards = await db.board.findMany({
          where: whereClause,
          take: params.limit,
          include: {
            boardSections: {
              include: { _count: { select: { tasks: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  results: boards.map((board) => ({
                    id: board.id,
                    name: board.name,
                    description: board.description,
                    createdAt: board.createdAt,
                    updatedAt: board.updatedAt,
                    sectionsCount: board.boardSections.length,
                    totalTasks: board.boardSections.reduce(
                      (sum, section) => sum + section._count.tasks,
                      0,
                    ),
                    sections: board.boardSections.map((section) => ({
                      id: section.id,
                      name: section.name,
                      taskCount: section._count.tasks,
                    })),
                  })),
                  resultCount: boards.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "find_similar_tasks",
      "Find tasks similar to a given task using vector similarity",
      {
        taskId: z.string().min(1, "Task ID is required"),
        limit: z.number().min(1).max(20).default(5),
        threshold: z.number().min(0).max(1).default(0.5),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        await getMcpUser(); // auth gate

        const results = await vectorSearchService.findSimilarTasks(
          params.taskId,
          params.limit,
        );

        const filteredResults = results.filter(
          (result) => result.similarity >= params.threshold,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  sourceTaskId: params.taskId,
                  results: filteredResults.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100,
                  })),
                  resultCount: filteredResults.length,
                  searchType: "similarity-based",
                  threshold: params.threshold,
                  message: `Found ${filteredResults.length} similar tasks`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      "vector_search_health",
      "Check vector search functionality and status",
      {},
      async () => {
        await getMcpUser(); // auth gate

        const healthStatus = await vectorSearchService.healthCheck();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  health: healthStatus,
                  message: healthStatus.healthy
                    ? "Vector search is operational"
                    : "Vector search has issues",
                  recommendations: healthStatus.healthy
                    ? ["Vector search is ready for use"]
                    : ["Check pgvector installation", "Verify database connectivity"],
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ── Analytics tools ─────────────────────────────────────────────────────

    server.tool(
      "analyze_project_health",
      "Analyze project health metrics and performance indicators",
      analyticsSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const board = await db.board.findFirst({
            where: {
              id: params.boardId,
              access: { has: mcpUser.id },
            },
            include: {
              boardSections: {
                include: { tasks: { include: { assignedTo: true } } },
              },
            },
          });

          if (!board) {
            throw new Error("Board not found or access denied");
          }

          const now = new Date();
          const timeRangeMap = { week: 7, month: 30, quarter: 90 };
          const daysBack = timeRangeMap[params.timeRange as keyof typeof timeRangeMap];
          const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

          const allTasks = board.boardSections.flatMap((section) => section.tasks);
          const recentTasks = allTasks.filter(
            (task) => new Date(task.createdAt) >= startDate,
          );

          const totalTasks = recentTasks.length;
          const completedTasks = recentTasks.filter((task) => task.status === "COMPLETED").length;
          const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

          const completedTasksWithDuration = recentTasks.filter(
            (task) => task.status === "COMPLETED" && task.updatedAt && task.createdAt,
          );
          const avgTaskDuration =
            completedTasksWithDuration.length > 0
              ? completedTasksWithDuration.reduce((sum, task) => {
                  return (
                    sum +
                    (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime())
                  );
                }, 0) /
                completedTasksWithDuration.length /
                (1000 * 60 * 60 * 24)
              : 0;

          const teamMetrics = params.includeTeamMetrics
            ? {
                totalMembers: Array.from(
                  new Set(recentTasks.map((task) => task.assignedToId).filter(Boolean)),
                ).length,
                tasksPerMember: recentTasks.reduce(
                  (acc, task) => {
                    if (task.assignedToId) {
                      acc[task.assignedToId] = (acc[task.assignedToId] || 0) + 1;
                    }
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
                memberWorkload: recentTasks.reduce(
                  (acc, task) => {
                    if (task.assignedToId && task.assignedTo?.name) {
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
                  {} as Record<string, { assigned: number; completed: number }>,
                ),
              }
            : null;

          const bottlenecks = [];
          const inProgressTasks = recentTasks.filter((task) => task.status === "IN_PROGRESS");
          const avgInProgressDuration =
            inProgressTasks.reduce((sum, task) => {
              return sum + (now.getTime() - new Date(task.createdAt).getTime());
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
              avgInProgressDuration: Math.round(avgInProgressDuration * 10) / 10,
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
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw new Error(
            `Analytics analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );

    server.tool(
      "analyze_team_performance",
      "Analyze team member performance and workload distribution",
      teamPerformanceSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        try {
          const now = new Date();
          const timeRangeMap = { week: 7, month: 30, quarter: 90 };
          const daysBack = timeRangeMap[params.timeRange as keyof typeof timeRangeMap];
          const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

          const whereClause = {
            assignedTo: { id: mcpUser.id },
            createdAt: { gte: startDate },
            ...(params.boardId && {
              board: { id: params.boardId, access: { has: mcpUser.id } },
            }),
          };

          const tasks = await db.task.findMany({
            where: whereClause,
            include: { assignedTo: true },
          });

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
            >,
          );

          Object.values(teamPerformance).forEach((member) => {
            member.completionRate =
              member.totalTasks > 0
                ? Math.round((member.completedTasks / member.totalTasks) * 100) / 100
                : 0;
          });

          const result = {
            companyId: mcpUser.companyId,
            boardId: params.boardId || "all",
            timeRange: params.timeRange,
            analysisDate: now.toISOString(),
            teamOverview: {
              totalMembers: Object.keys(teamPerformance).length,
              totalTasks: tasks.length,
              completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
              avgTeamCompletionRate:
                Object.values(teamPerformance).reduce(
                  (sum: number, member) => sum + member.completionRate,
                  0,
                ) / Math.max(Object.keys(teamPerformance).length, 1),
            },
            memberPerformance: params.includeIndividualMetrics ? teamPerformance : null,
            insights: generateTeamInsights(teamPerformance, tasks),
          };

          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw new Error(
            `Team performance analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );
  },
  {
    capabilities: {
      tools: {
        health_check: { description: "Check server health" },
        server_info: { description: "Get server configuration" },
        create_task: { description: "Create a new task with proper validation" },
        search_tasks: { description: "Search and filter tasks with multiple criteria" },
        update_task: { description: "Update existing task properties" },
        get_task: { description: "Get a single task by ID with full details" },
        delete_task: { description: "Delete a task" },
        mark_task_done: { description: "Set task status to COMPLETED" },
        move_task: { description: "Move a task to a different board section" },
        get_board_info: { description: "Get comprehensive board information" },
        compare_boards: { description: "Compare metrics between multiple boards" },
        suggest_board_optimizations: { description: "Generate board optimization suggestions" },
        list_boards: { description: "List accessible boards" },
        create_board: { description: "Create a new board" },
        edit_board: { description: "Update board name and/or description" },
        delete_board: { description: "Delete a board" },
        list_board_sections: { description: "List sections of a board with task counts" },
        create_board_section: { description: "Add a new section to a board" },
        delete_board_section: { description: "Delete an empty board section" },
        semantic_search_tasks: { description: "Vector-based semantic search" },
        hybrid_search: { description: "Combined vector and keyword search" },
        get_embedding_status: { description: "Check embedding availability" },
        search_boards: { description: "Search accessible boards" },
        find_similar_tasks: { description: "Find similar tasks by vector similarity" },
        vector_search_health: { description: "Vector search health status" },
        analyze_project_health: { description: "Analyze project health metrics" },
        analyze_team_performance: { description: "Analyze team performance and workload" },
      },
    },
  },
  {
    basePath: "/api/mcp",
    verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
    maxDuration: parseInt(process.env.MCP_MAX_DURATION || "800"),
  },
);

export { handler as GET, handler as POST, handler as DELETE };
