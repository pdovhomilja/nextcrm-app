"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from 'zod/v3';

const TaskTableFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z
    .enum(["NEW", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  boardId: z.string().optional(),
  assignedToId: z.string().optional(),
  sortBy: z
    .enum(["title", "status", "priority", "dueDate", "createdAt", "updatedAt"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  dueDateFilter: z
    .enum(["overdue", "today", "week", "month", "all"])
    .optional(),
});

export type TaskTableRow = {
  id: string;
  title: string;
  description: string | null;
  status: "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  board: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  } | null;
  isOverdue: boolean;
};

export type TaskTableData = {
  tasks: TaskTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: z.infer<typeof TaskTableFiltersSchema>;
  summary: {
    totalTasks: number;
    statusCounts: {
      NEW: number;
      IN_PROGRESS: number;
      ON_HOLD: number;
      COMPLETED: number;
      CANCELLED: number;
    };
    priorityCounts: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      CRITICAL: number;
    };
    overdueTasks: number;
  };
};

export async function getTaskTableData(
  input?: Partial<z.infer<typeof TaskTableFiltersSchema>>
): Promise<{ data?: TaskTableData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.activeCompanyId;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const filters = TaskTableFiltersSchema.parse(input || {});
    const {
      page,
      pageSize,
      search,
      status,
      priority,
      boardId,
      assignedToId,
      sortBy,
      sortOrder,
      dueDateFilter,
    } = filters;

    // Build where clause with board access filtering
    const where: any = {
      boardSection: {
        board: {
          access: {
            has: session.user.id, // User has access to the board
          },
        },
      },
    };

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (priority) {
      where.priority = priority;
    }

    if (boardId) {
      where.boardSection = {
        board: {
          id: boardId,
        },
      };
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Due date filtering
    if (dueDateFilter) {
      const now = new Date();
      switch (dueDateFilter) {
        case "overdue":
          where.dueDate = { lt: now };
          // For overdue filter, always exclude COMPLETED and CANCELLED tasks
          // regardless of status filter
          if (status && !["COMPLETED", "CANCELLED"].includes(status)) {
            where.status = status;
          } else {
            where.status = { notIn: ["COMPLETED", "CANCELLED"] };
          }
          break;
        case "today":
          const startOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          where.dueDate = { gte: startOfDay, lt: endOfDay };
          // Apply status filter for other due date filters
          if (status) {
            where.status = status;
          }
          break;
        case "week":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          where.dueDate = { gte: now, lte: weekFromNow };
          // Apply status filter for other due date filters
          if (status) {
            where.status = status;
          }
          break;
        case "month":
          const monthFromNow = new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
          );
          where.dueDate = { gte: now, lte: monthFromNow };
          // Apply status filter for other due date filters
          if (status) {
            where.status = status;
          }
          break;
      }
    } else {
      // Apply status filter only when there's no due date filter or it's not overdue
      if (status) {
        where.status = status;
      }
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sortBy) {
      case "title":
        orderBy = { title: sortOrder };
        break;
      case "status":
        orderBy = { status: sortOrder };
        break;
      case "priority":
        // Custom priority ordering
        orderBy = { priority: sortOrder };
        break;
      case "dueDate":
        orderBy = { dueDate: sortOrder };
        break;
      case "createdAt":
        orderBy = { createdAt: sortOrder };
        break;
      case "updatedAt":
      default:
        orderBy = { updatedAt: sortOrder };
        break;
    }

    // Execute queries in parallel
    const [tasks, totalCount, statusCounts, priorityCounts, overdueCount] =
      await Promise.all([
        // Main task query with pagination
        db.task.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            boardSection: {
              select: {
                id: true,
                name: true,
                board: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),

        // Total count for pagination
        db.task.count({ where }),

        // Status counts for summary
        db.task.groupBy({
          by: ["status"],
          where: {
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
              },
            },
          },
          _count: { id: true },
        }),

        // Priority counts for summary
        db.task.groupBy({
          by: ["priority"],
          where: {
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
              },
            },
          },
          _count: { id: true },
        }),

        // Overdue count
        db.task.count({
          where: {
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                },
              },
            },
            dueDate: { lt: new Date() },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
      ]);

    // Transform tasks data
    const now = new Date();
    const transformedTasks: TaskTableRow[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskTableRow["status"],
      priority: task.priority as TaskTableRow["priority"],
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedTo: task.assignedTo,
      creator: task.createdBy,
      board: task.boardSection.board,
      section: task.boardSection,
      isOverdue: task.dueDate
        ? task.dueDate < now &&
          !["COMPLETED", "CANCELLED"].includes(task.status)
        : false,
    }));

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Transform status counts
    const statusCountsMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.status as keyof TaskTableData["summary"]["statusCounts"]] =
          item._count.id;
        return acc;
      },
      {
        NEW: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }
    );

    // Transform priority counts
    const priorityCountsMap = priorityCounts.reduce(
      (acc, item) => {
        acc[item.priority as keyof TaskTableData["summary"]["priorityCounts"]] =
          item._count.id;
        return acc;
      },
      {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      }
    );

    const result: TaskTableData = {
      tasks: transformedTasks,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters,
      summary: {
        totalTasks: totalCount,
        statusCounts: statusCountsMap,
        priorityCounts: priorityCountsMap,
        overdueTasks: overdueCount,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid filter parameters" };
    }
    console.error("Task table data error:", error);
    return { error: "Failed to retrieve task data" };
  }
}
