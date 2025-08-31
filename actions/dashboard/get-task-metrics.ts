"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod/v3";

const TaskMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  boardId: z.string().optional(),
});

export type TaskMetricsData = {
  totalTasks: number;
  tasksByStatus: {
    NEW: number;
    IN_PROGRESS: number;
    ON_HOLD: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  tasksThisWeek: number;
  tasksThisMonth: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number | null;
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
  };
};

export async function getTaskMetrics(
  input?: z.infer<typeof TaskMetricsSchema>,
): Promise<{ data?: TaskMetricsData; error?: string }> {
  try {
    // Session validation
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.activeCompanyId;
    if (!companyId) {
      return { error: "Company context required" };
    }

    // Input validation
    const validatedInput = TaskMetricsSchema.parse(input || {});
    const { dateRange, boardId } = validatedInput;

    // Calculate date range for filtering
    const now = new Date();
    let dateFilter: Date | undefined;

    switch (dateRange) {
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = undefined;
    }

    // Base query filter with company isolation
    const baseFilter = {
      ...(boardId && { boardId }),
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
    };

    // Get all tasks count by status with company filtering
    const tasksByStatus = await db.task.groupBy({
      by: ["status"],
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        }, // Company isolation via user relationship
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
      _count: {
        id: true,
      },
    });

    // Transform status counts to expected format
    const statusCounts = {
      NEW: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    tasksByStatus.forEach((item) => {
      statusCounts[item.status as keyof typeof statusCounts] = item._count.id;
    });

    const totalTasks = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Get tasks created this week
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tasksThisWeek = await db.task.count({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        createdAt: { gte: weekStart },
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
    });

    // Get tasks created this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tasksThisMonth = await db.task.count({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        createdAt: { gte: monthStart },
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
    });

    // Get overdue tasks
    const overdueTasks = await db.task.count({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now },
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
    });

    // Calculate completion rate
    const completedTasks = statusCounts.COMPLETED;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time (for completed tasks)
    const completedTasksWithTime = await db.task.findMany({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        status: "COMPLETED",
        ...(boardId && { boardSection: { board: { id: boardId } } }),
        ...(dateFilter && { updatedAt: { gte: dateFilter } }),
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let averageCompletionTime: number | null = null;
    if (completedTasksWithTime.length > 0) {
      const totalTime = completedTasksWithTime.reduce((sum, task) => {
        return sum + (task.updatedAt.getTime() - task.createdAt.getTime());
      }, 0);
      averageCompletionTime = Math.round(
        totalTime / completedTasksWithTime.length / (1000 * 60 * 60 * 24),
      ); // Convert to days
    }

    // Calculate trends (week over week, month over month)
    const lastWeekStart = new Date(
      weekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const tasksLastWeek = await db.task.count({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        createdAt: { gte: lastWeekStart, lt: weekStart },
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
    });

    const lastMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1,
    );
    const tasksLastMonth = await db.task.count({
      where: {
        createdBy: {
          memberships: {
            some: { companyId: companyId },
          },
        },
        createdAt: { gte: lastMonthStart, lt: monthStart },
        ...(boardId && { boardSection: { board: { id: boardId } } }),
      },
    });

    const weekOverWeek =
      tasksLastWeek > 0
        ? ((tasksThisWeek - tasksLastWeek) / tasksLastWeek) * 100
        : 0;
    const monthOverMonth =
      tasksLastMonth > 0
        ? ((tasksThisMonth - tasksLastMonth) / tasksLastMonth) * 100
        : 0;

    const result: TaskMetricsData = {
      totalTasks,
      tasksByStatus: statusCounts,
      tasksThisWeek,
      tasksThisMonth,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
      averageCompletionTime,
      trends: {
        weekOverWeek: Math.round(weekOverWeek * 100) / 100,
        monthOverMonth: Math.round(monthOverMonth * 100) / 100,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: "Validation failed",
      };
    }

    console.error("Task metrics error:", error);
    return { error: "Failed to retrieve task metrics" };
  }
}
