"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod/v3";

const TaskTimelineSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "1y"]).optional().default("30d"),
  boardId: z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).optional().default("day"),
  includeCompleted: z.boolean().optional().default(true),
  includeCreated: z.boolean().optional().default(true),
});

export type TaskTimelineDataPoint = {
  date: string;
  created: number;
  completed: number;
  inProgress: number;
  cumulative: number;
};

export type TaskTimelineData = {
  data: TaskTimelineDataPoint[];
  summary: {
    totalCreated: number;
    totalCompleted: number;
    completionRate: number;
    averageDaily: {
      created: number;
      completed: number;
    };
    trends: {
      createdTrend: number;
      completedTrend: number;
      completionRateTrend: number;
    };
  };
  chartConfig: {
    created: {
      label: string;
      color: string;
    };
    completed: {
      label: string;
      color: string;
    };
    inProgress: {
      label: string;
      color: string;
    };
  };
};

export async function getTaskTimelineData(
  input?: z.infer<typeof TaskTimelineSchema>,
): Promise<{ data?: TaskTimelineData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.activeCompanyId;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = TaskTimelineSchema.parse(input || {});
    const {
      dateRange,
      boardId,
      granularity,
      includeCompleted,
      includeCreated,
    } = validatedInput;

    // Calculate date range and intervals
    const now = new Date();
    let startDate: Date;
    let intervalCount: number;
    let intervalUnit: "day" | "week" | "month";

    switch (dateRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalCount = 7;
        intervalUnit = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "day" ? 30 : granularity === "week" ? 5 : 1;
        intervalUnit = granularity;
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "day" ? 90 : granularity === "week" ? 13 : 3;
        intervalUnit = granularity;
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "month" ? 12 : granularity === "week" ? 52 : 365;
        intervalUnit =
          granularity === "day"
            ? "day"
            : granularity === "week"
              ? "week"
              : "month";
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalCount = 30;
        intervalUnit = "day";
    }

    // Base filter for tasks - need to find tasks through board sections
    const baseFilter = {
      boardSection: {
        board: {
          access: {
            has: session.user.id, // Check if user has access to the board
          },
        },
      },
      ...(boardId && {
        boardSection: {
          boardId,
        },
      }),
    };

    // Generate date intervals
    const intervals: { start: Date; end: Date; label: string }[] = [];

    for (let i = 0; i < intervalCount; i++) {
      let intervalStart: Date;
      let intervalEnd: Date;
      let label: string;

      switch (intervalUnit) {
        case "day":
          intervalStart = new Date(
            startDate.getTime() + i * 24 * 60 * 60 * 1000,
          );
          intervalEnd = new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000);
          label = intervalStart.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        case "week":
          intervalStart = new Date(
            startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000,
          );
          intervalEnd = new Date(
            intervalStart.getTime() + 7 * 24 * 60 * 60 * 1000,
          );
          label = `Week of ${intervalStart.toISOString().split("T")[0]}`;
          break;
        case "month":
          intervalStart = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + i,
            1,
          );
          intervalEnd = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + i + 1,
            1,
          );
          label = intervalStart.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          break;
        default:
          intervalStart = startDate;
          intervalEnd = now;
          label = "Total";
      }

      intervals.push({ start: intervalStart, end: intervalEnd, label });
    }

    // Fetch data for each interval
    const timelineData: TaskTimelineDataPoint[] = [];
    let cumulativeCreated = 0;
    let totalCreated = 0;
    let totalCompleted = 0;

    for (const interval of intervals) {
      const [createdCount, completedCount, inProgressCount] = await Promise.all(
        [
          // Tasks created in this interval
          includeCreated
            ? db.task.count({
                where: {
                  ...baseFilter,
                  createdAt: {
                    gte: interval.start,
                    lt: interval.end,
                  },
                },
              })
            : 0,

          // Tasks completed in this interval
          includeCompleted
            ? db.task.count({
                where: {
                  ...baseFilter,
                  status: "COMPLETED",
                  updatedAt: {
                    gte: interval.start,
                    lt: interval.end,
                  },
                },
              })
            : 0,

          // Tasks moved to in-progress in this interval
          db.task.count({
            where: {
              ...baseFilter,
              status: "IN_PROGRESS",
              updatedAt: {
                gte: interval.start,
                lt: interval.end,
              },
            },
          }),
        ],
      );

      cumulativeCreated += createdCount;
      totalCreated += createdCount;
      totalCompleted += completedCount;

      timelineData.push({
        date: interval.label,
        created: createdCount,
        completed: completedCount,
        inProgress: inProgressCount,
        cumulative: cumulativeCreated,
      });
    }

    // Calculate summary metrics
    const completionRate =
      totalCreated > 0 ? (totalCompleted / totalCreated) * 100 : 0;
    const averageDailyCreated = totalCreated / intervalCount;
    const averageDailyCompleted = totalCompleted / intervalCount;

    // Calculate trends (comparing first half vs second half)
    const midPoint = Math.floor(timelineData.length / 2);
    const firstHalf = timelineData.slice(0, midPoint);
    const secondHalf = timelineData.slice(midPoint);

    const firstHalfCreated = firstHalf.reduce(
      (sum, point) => sum + point.created,
      0,
    );
    const secondHalfCreated = secondHalf.reduce(
      (sum, point) => sum + point.created,
      0,
    );
    const firstHalfCompleted = firstHalf.reduce(
      (sum, point) => sum + point.completed,
      0,
    );
    const secondHalfCompleted = secondHalf.reduce(
      (sum, point) => sum + point.completed,
      0,
    );

    const createdTrend =
      firstHalfCreated > 0
        ? ((secondHalfCreated - firstHalfCreated) / firstHalfCreated) * 100
        : 0;
    const completedTrend =
      firstHalfCompleted > 0
        ? ((secondHalfCompleted - firstHalfCompleted) / firstHalfCompleted) *
          100
        : 0;

    const firstHalfCompletionRate =
      firstHalfCreated > 0 ? (firstHalfCompleted / firstHalfCreated) * 100 : 0;
    const secondHalfCompletionRate =
      secondHalfCreated > 0
        ? (secondHalfCompleted / secondHalfCreated) * 100
        : 0;
    const completionRateTrend =
      firstHalfCompletionRate > 0
        ? ((secondHalfCompletionRate - firstHalfCompletionRate) /
            firstHalfCompletionRate) *
          100
        : 0;

    const result: TaskTimelineData = {
      data: timelineData,
      summary: {
        totalCreated,
        totalCompleted,
        completionRate: Math.round(completionRate * 100) / 100,
        averageDaily: {
          created: Math.round(averageDailyCreated * 100) / 100,
          completed: Math.round(averageDailyCompleted * 100) / 100,
        },
        trends: {
          createdTrend: Math.round(createdTrend * 100) / 100,
          completedTrend: Math.round(completedTrend * 100) / 100,
          completionRateTrend: Math.round(completionRateTrend * 100) / 100,
        },
      },
      chartConfig: {
        created: {
          label: "Tasks Created",
          color: "hsl(var(--chart-1))",
        },
        completed: {
          label: "Tasks Completed",
          color: "hsl(var(--chart-2))",
        },
        inProgress: {
          label: "In Progress",
          color: "hsl(var(--chart-3))",
        },
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid input parameters" };
    }
    console.error("Task timeline data error:", error);
    return { error: "Failed to retrieve task timeline data" };
  }
}
