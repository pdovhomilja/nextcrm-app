"use server";

import { auth } from "@/auth";
import { getTaskMetrics } from "./get-task-metrics";
import { getBoardMetrics } from "./get-board-metrics";
import { getUserMetrics } from "./get-user-metrics";

export type DashboardOverviewData = {
  tasks: Awaited<ReturnType<typeof getTaskMetrics>>["data"];
  boards: Awaited<ReturnType<typeof getBoardMetrics>>["data"];
  users: Awaited<ReturnType<typeof getUserMetrics>>["data"];
};

export async function getDashboardOverview(
  dateRange: "7d" | "30d" | "90d" | "all" = "30d",
): Promise<{
  data?: DashboardOverviewData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    // Execute all metrics in parallel for better performance
    const [taskResult, boardResult, userResult] = await Promise.all([
      getTaskMetrics({ dateRange }),
      getBoardMetrics({ dateRange, includeSections: true }),
      getUserMetrics({ dateRange, includeActivity: true }),
    ]);

    // Check for errors
    if (taskResult.error || boardResult.error || userResult.error) {
      return {
        error:
          "Failed to retrieve some metrics: " +
          [taskResult.error, boardResult.error, userResult.error]
            .filter(Boolean)
            .join(", "),
      };
    }

    return {
      data: {
        tasks: taskResult.data,
        boards: boardResult.data,
        users: userResult.data,
      },
    };
  } catch (error) {
    console.error("Dashboard overview error:", error);
    return { error: "Failed to retrieve dashboard overview" };
  }
}
