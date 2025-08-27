"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from 'zod/v3';
import {
  taskPriorityColors,
  taskStatusColors,
} from "@/lib/dashboard/chart-utils";

const DistributionDataSchema = z.object({
  type: z.enum(["priority", "status", "board", "user"]),
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  boardId: z.string().optional(),
  includeCompleted: z.boolean().optional().default(true),
});

export type DistributionDataPoint = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  label: string;
};

export type DistributionData = {
  data: DistributionDataPoint[];
  total: number;
  chartConfig: {
    [key: string]: {
      label: string;
      color: string;
    };
  };
  summary: {
    mostCommon: {
      name: string;
      percentage: number;
    };
    leastCommon: {
      name: string;
      percentage: number;
    };
    distribution: string;
  };
};

export async function getDistributionData(
  input: z.infer<typeof DistributionDataSchema>
): Promise<{ data?: DistributionData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.activeCompanyId;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = DistributionDataSchema.parse(input);
    const { type, dateRange, boardId, includeCompleted } = validatedInput;

    // Calculate date filter
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

    // Base filter for tasks - need to find tasks through board sections and boards
    let baseFilter: any = {
      boardSection: {
        board: {
          access: {
            has: session.user.id, // User has access to the board
          },
        },
      },
    };

    // Add specific board filter if provided
    if (boardId) {
      baseFilter.boardSection = {
        board: {
          id: boardId,
        },
      };
    }

    // Add date filter if provided
    if (dateFilter) {
      baseFilter.createdAt = { gte: dateFilter };
    }

    // Add status filter if excluding completed tasks
    if (!includeCompleted) {
      baseFilter.status = { not: "COMPLETED" };
    }

    let chartConfig: { [key: string]: { label: string; color: string } } = {};
    let groupedData: { [key: string]: number } = {};

    switch (type) {
      case "priority":
        chartConfig = taskPriorityColors;
        const priorityGroups = await db.task.groupBy({
          by: ["priority"],
          where: baseFilter,
          _count: { id: true },
        });

        priorityGroups.forEach((group) => {
          groupedData[group.priority] = group._count.id;
        });
        break;

      case "status":
        chartConfig = taskStatusColors;
        const statusGroups = await db.task.groupBy({
          by: ["status"],
          where: baseFilter,
          _count: { id: true },
        });

        statusGroups.forEach((group) => {
          groupedData[group.status] = group._count.id;
        });
        break;

      case "board":
        // For board distribution, we need to aggregate by board through board sections
        const tasksWithBoards = await db.task.findMany({
          where: baseFilter,
          include: {
            boardSection: {
              include: {
                board: {
                  select: { id: true, name: true }
                }
              }
            }
          },
        });

        // Group by board and count tasks
        const boardTaskCounts: { [boardId: string]: { count: number; name: string } } = {};
        
        tasksWithBoards.forEach((task) => {
          const board = task.boardSection.board;
          if (board) {
            if (!boardTaskCounts[board.id]) {
              boardTaskCounts[board.id] = {
                count: 0,
                name: board.name
              };
            }
            boardTaskCounts[board.id].count += 1;
          }
        });

        Object.entries(boardTaskCounts).forEach(([boardId, data], index) => {
          groupedData[data.name] = data.count;
          chartConfig[data.name] = {
            label: data.name,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
          };
        });
        break;

      case "user":
        const userGroups = await db.task.groupBy({
          by: ["assignedToId"],
          where: {
            ...baseFilter,
            assignedToId: { not: null },
          },
          _count: { id: true },
        });

        // Get user names
        const userIds = userGroups
          .map((g) => g.assignedToId)
          .filter(Boolean) as string[];
        const users = await db.user.findMany({
          where: { 
            id: { in: userIds }, 
            memberships: { 
              some: { companyId: companyId } 
            } 
          },
          select: { id: true, name: true, email: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

        userGroups.forEach((group, index) => {
          if (group.assignedToId) {
            const userName = userMap.get(group.assignedToId) || "Unknown User";
            groupedData[userName] = group._count.id;
            chartConfig[userName] = {
              label: userName,
              color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
          }
        });
        break;
    }

    // Calculate total and percentages
    const total = Object.values(groupedData).reduce(
      (sum, count) => sum + count,
      0
    );

    const distributionData: DistributionDataPoint[] = Object.entries(
      groupedData
    )
      .map(([name, value]) => ({
        name,
        value,
        percentage:
          total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0,
        color: chartConfig[name]?.color || "hsl(var(--muted))",
        label: chartConfig[name]?.label || name,
      }))
      .sort((a, b) => b.value - a.value);

    // Summary statistics
    const mostCommon = distributionData[0] || { name: "None", percentage: 0 };
    const leastCommon = distributionData[distributionData.length - 1] || {
      name: "None",
      percentage: 0,
    };

    const distribution =
      distributionData.length <= 2
        ? "concentrated"
        : distributionData.length >= 6
          ? "diverse"
          : "balanced";

    const result: DistributionData = {
      data: distributionData,
      total,
      chartConfig,
      summary: {
        mostCommon: {
          name: mostCommon.name,
          percentage: mostCommon.percentage,
        },
        leastCommon: {
          name: leastCommon.name,
          percentage: leastCommon.percentage,
        },
        distribution,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid input parameters" };
    }
    console.error("Distribution data error:", error);
    return { error: "Failed to retrieve distribution data" };
  }
}