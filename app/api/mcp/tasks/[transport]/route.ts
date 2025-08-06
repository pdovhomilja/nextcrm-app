import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";

const handler = createMcpHandler(
  async (server) => {
    // Create task tool
    server.tool(
      "create_task",
      "Create a new task in the specified board section",
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        boardSectionId: z.string(),
        priority: z
          .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
          .default("MEDIUM"),
        assigneeIds: z.array(z.string()).optional(),
        dueDate: z.string().optional(), // ISO date string
      }),
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // Validate company context
        const companyId = session.user.cid;
        if (!companyId) {
          throw new Error("Company context required");
        }

        // Verify board section exists and user has access
        const boardSection = await db.boardSection.findFirst({
          where: {
            id: params.boardSectionId,
            board: {
              access: {
                has: session.user.id,
              },
            },
          },
          include: {
            board: true,
          },
        });

        if (!boardSection) {
          throw new Error("Board section not found or access denied");
        }

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
      }
    );

    // Search tasks tool
    server.tool(
      "search_tasks",
      "Search and filter tasks with semantic and traditional search",
      {
        query: z.string().optional(),
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
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // Validate company context
        const companyId = session.user.cid;
        if (!companyId) {
          throw new Error("Company context required");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = {
          boardSection: {
            board: {
              access: {
                has: session.user.id,
              },
            },
          },
        };

        if (params.boardId) {
          whereClause.boardSection.boardId = params.boardId;
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

        if (params.query) {
          whereClause.OR = [
            { title: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
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
                  query: params.query,
                  filters: {
                    boardId: params.boardId,
                    status: params.status,
                    priority: params.priority,
                    assigneeIds: params.assigneeIds,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Update task tool
    server.tool(
      "update_task",
      "Update an existing task",
      {
        taskId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z
          .enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
          .optional(),
        assignedToId: z.string().optional(),
        dueDate: z.string().optional(), // ISO date string
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // Validate company context
        const companyId = session.user.cid;
        if (!companyId) {
          throw new Error("Company context required");
        }

        // Verify task exists and user has access
        const existingTask = await db.task.findFirst({
          where: {
            id: params.taskId,
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
              },
            },
          },
        });

        if (!existingTask) {
          throw new Error("Task not found or access denied");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        if (params.title) updateData.title = params.title;
        if (params.description !== undefined)
          updateData.description = params.description;
        if (params.priority) updateData.priority = params.priority;
        if (params.status) updateData.status = params.status;
        if (params.assignedToId) updateData.assignedToId = params.assignedToId;
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
      }
    );

    // Get task details tool
    server.tool(
      "get_task",
      "Get detailed information about a specific task",
      {
        taskId: z.string(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const task = await db.task.findFirst({
          where: {
            id: params.taskId,
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
              },
            },
          },
          include: {
            assignedTo: true,
            createdBy: true,
            boardSection: {
              include: {
                board: true,
              },
            },
            history: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });

        if (!task) {
          throw new Error("Task not found or access denied");
        }

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
                    position: task.position,
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                    assignedTo: {
                      id: task.assignedTo.id,
                      name: task.assignedTo.name,
                      email: task.assignedTo.email,
                    },
                    createdBy: {
                      id: task.createdBy.id,
                      name: task.createdBy.name,
                      email: task.createdBy.email,
                    },
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                    recentHistory: task.history.map((h) => ({
                      id: h.id,
                      description: h.description,
                      createdAt: h.createdAt,
                    })),
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        create_task: { description: "Create a new task" },
        search_tasks: { description: "Search and filter tasks" },
        update_task: { description: "Update an existing task" },
        get_task: { description: "Get detailed task information" },
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
