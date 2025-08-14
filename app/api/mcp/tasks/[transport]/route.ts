import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";

const handler = createMcpHandler(
  async (server) => {
    // Create task tool with proper schema
    const createTaskParams = {
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      boardSectionId: z.string().min(1, "Board section ID is required"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      assigneeIds: z.array(z.string()).optional(),
      dueDate: z.string().optional(), // ISO date string
    } as Record<string, import("zod").ZodTypeAny>;
    server.tool(
      "create_task",
      "Create a new task in the specified board section",
      createTaskParams,
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        try {
          // ✅ SAFE: Using existing database structure, no schema modifications
          const task = await db.task.create({
            data: {
              title: params.title,
              description: params.description || "",
              boardSectionId: params.boardSectionId,
              priority: params.priority,
              status: "NEW",
              createdById: session.user.id,
              assignedToId: params.assigneeIds?.[0] || session.user.id,
              dueDate: params.dueDate
                ? new Date(params.dueDate)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              position: 0,
            },
            include: {
              assignedTo: true,
              createdBy: true,
              boardSection: {
                include: {
                  board: true,
                },
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
                  2
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    );

    // Search tasks tool with proper schema
    const searchTasksParams = {
      searchTerm: z.string().optional(),
      boardId: z.string().optional(),
      status: z
        .array(
          z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
        )
        .optional(),
      priority: z
        .array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
        .optional(),
      assigneeIds: z.array(z.string()).optional(),
      limit: z.number().min(1).max(50).default(10),
    } as Record<string, import("zod").ZodTypeAny>;
    server.tool(
      "search_tasks",
      "Search and filter tasks with semantic and traditional search",
      searchTasksParams,
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        try {
          // ✅ SAFE: Using existing database structure for queries
          const whereClause: Prisma.TaskWhereInput = {
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
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
              {
                description: {
                  contains: params.searchTerm,
                  mode: "insensitive",
                },
              },
            ];
          }

          const tasks = await db.task.findMany({
            where: whereClause,
            take: params.limit,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            include: {
              assignedTo: true,
              createdBy: true,
              boardSection: {
                include: {
                  board: true,
                },
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
                  2
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to search tasks: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    );

    // Update task tool with proper schema
    const updateTaskParams = {
      taskId: z.string().min(1, "Task ID is required"),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      status: z
        .enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
        .optional(),
      assignedToId: z.string().optional(),
      dueDate: z.string().optional(), // ISO date string
    } as Record<string, import("zod").ZodTypeAny>;
    server.tool(
      "update_task",
      "Update an existing task",
      updateTaskParams,
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        try {
          // ✅ SAFE: Using existing database structure for updates
          const updateData: Prisma.TaskUpdateInput = {};
          if (params.title) updateData.title = params.title;
          if (params.description !== undefined)
            updateData.description = params.description;
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
              boardSection: {
                include: {
                  board: true,
                },
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
                      dueDate: task.dueDate,
                      boardName: task.boardSection.board.name,
                      sectionName: task.boardSection.name,
                      assignedTo: task.assignedTo.name,
                      updatedAt: task.updatedAt,
                    },
                    message: `Task "${task.title}" updated successfully`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    );
  },
  {
    capabilities: {
      tools: {
        create_task: {
          description: "Create a new task with proper validation",
        },
        search_tasks: {
          description: "Search and filter tasks with multiple criteria",
        },
        update_task: { description: "Update existing task properties" },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
    maxDuration: parseInt(process.env.MCP_MAX_DURATION || "800"),
  }
);

export { handler as GET, handler as POST, handler as DELETE };
