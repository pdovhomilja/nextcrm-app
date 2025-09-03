"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod/v3";
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

const BoardMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  includeSections: z.boolean().optional().default(true),
  companyId: z.string(),
});

export type BoardMetricsData = {
  totalBoards: number;
  activeBoardsCount: number;
  boardsWithTasks: number;
  averageTasksPerBoard: number;
  mostActiveBoards: Array<{
    id: string;
    title: string;
    taskCount: number;
    sectionCount: number;
    lastActivity: Date;
  }>;
  boardActivity: {
    created: number;
    updated: number;
    archived: number;
  };
  sectionDistribution: {
    totalSections: number;
    averageSectionsPerBoard: number;
    sectionUtilization: number;
  };
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
  };
};

export async function getBoardMetrics(
  input: z.infer<typeof BoardMetricsSchema>,
): Promise<{ success: boolean; data?: BoardMetricsData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const validatedInput = BoardMetricsSchema.parse(input);
    const { dateRange, includeSections, companyId } = validatedInput;
    
    // 🚨 CRITICAL: URL company ID must take precedence over session
    const targetCompanyId = companyId;
    
    if (!targetCompanyId) {
      throw new Error("Company context required - companyId must be provided");
    }
    
    console.log("🎯 ENFORCED companyId:", targetCompanyId, "from URL, ignoring session");

    // 🔒 SECURITY-FIRST WRAPPER: Automatic company validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      targetCompanyId,
      "board",  // Resource type
      "metrics", // Action
      async () => {

        // ✅ SIMPLIFIED QUERIES - Security handled by wrapper
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

        // Get total boards WITH EXPLICIT COMPANY FILTERING
        const totalBoards = await db.board.count({
          where: {
            companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
            OR: [
              { access: { has: session.user.id } }, // User has explicit access
              { createdBy: session.user.id }, // User is creator
            ],
            ...(dateFilter && { createdAt: { gte: dateFilter } }),
          },
        });

        // Get boards with tasks WITH EXPLICIT COMPANY FILTERING
        const boardsWithTasksQuery = await db.board.findMany({
          where: {
            companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
            OR: [
              { access: { has: session.user.id } }, // User has explicit access
              { createdBy: session.user.id }, // User is creator
            ],
          },
          include: {
            _count: {
              select: {
                boardSections: true,
              },
            },
            boardSections: {
              include: {
                _count: {
                  select: {
                    tasks: true,
                  },
                },
                tasks: {
                  select: {
                    id: true,
                    updatedAt: true,
                  },
                  orderBy: {
                    updatedAt: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
        });

    const boardsWithTasks = boardsWithTasksQuery.filter((board) =>
      board.boardSections.some((section) => section._count.tasks > 0),
    ).length;

    const activeBoardsCount = boardsWithTasksQuery.filter((board) => {
      const lastActivity = board.boardSections.flatMap(
        (section) => section.tasks,
      )[0]?.updatedAt;
      if (!lastActivity) return false;
      const daysSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActivity <= 7; // Active in last 7 days
    }).length;

    // Calculate average tasks per board
    const totalTasksAcrossBoards = boardsWithTasksQuery.reduce(
      (sum, board) =>
        sum +
        board.boardSections.reduce(
          (sectionSum, section) => sectionSum + section._count.tasks,
          0,
        ),
      0,
    );
    const averageTasksPerBoard =
      totalBoards > 0 ? Math.round(totalTasksAcrossBoards / totalBoards) : 0;

    // Get most active boards (top 5)
    const mostActiveBoards = boardsWithTasksQuery
      .map((board) => {
        const taskCount = board.boardSections.reduce(
          (sum, section) => sum + section._count.tasks,
          0,
        );
        const lastActivity =
          board.boardSections.flatMap((section) => section.tasks)[0]
            ?.updatedAt || board.updatedAt;

        return {
          id: board.id,
          title: board.name,
          taskCount,
          sectionCount: includeSections ? board._count.boardSections : 0,
          lastActivity,
        };
      })
      .sort((a, b) => {
        // Sort by task count first, then by last activity
        if (a.taskCount !== b.taskCount) {
          return b.taskCount - a.taskCount;
        }
        return (
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime()
        );
      })
      .slice(0, 5);

    // Get board activity metrics
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const boardsCreatedThisWeek = await db.board.count({
      where: {
        companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
        OR: [
          { access: { has: session.user.id } },
          { createdBy: session.user.id },
        ],
        createdAt: { gte: weekStart },
      },
    });

    const boardsUpdatedThisWeek = await db.board.count({
      where: {
        companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
        OR: [
          { access: { has: session.user.id } },
          { createdBy: session.user.id },
        ],
        updatedAt: { gte: weekStart },
        createdAt: { lt: weekStart }, // Exclude newly created ones
      },
    });

    // Section distribution (if requested)
    let sectionDistribution = {
      totalSections: 0,
      averageSectionsPerBoard: 0,
      sectionUtilization: 0,
    };

    if (includeSections) {
      const totalSections = await db.boardSection.count({
        where: {
          board: {
            companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
            OR: [
              { access: { has: session.user.id } },
              { createdBy: session.user.id },
            ],
          },
        },
      });

      const sectionsWithTasks = await db.boardSection.count({
        where: {
          board: {
            companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
            OR: [
              { access: { has: session.user.id } },
              { createdBy: session.user.id },
            ],
          },
          tasks: {
            some: {},
          },
        },
      });

      sectionDistribution = {
        totalSections,
        averageSectionsPerBoard:
          totalBoards > 0 ? Math.round(totalSections / totalBoards) : 0,
        sectionUtilization:
          totalSections > 0
            ? Math.round((sectionsWithTasks / totalSections) * 100)
            : 0,
      };
    }

    // Calculate trends
    const lastWeekStart = new Date(
      weekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const boardsLastWeek = await db.board.count({
      where: {
        companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
        OR: [
          { access: { has: session.user.id } },
          { createdBy: session.user.id },
        ],
        createdAt: { gte: lastWeekStart, lt: weekStart },
      },
    });

    const lastMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1,
    );
    const boardsLastMonth = await db.board.count({
      where: {
        companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
        OR: [
          { access: { has: session.user.id } },
          { createdBy: session.user.id },
        ],
        createdAt: { gte: lastMonthStart, lt: monthStart },
      },
    });

    const boardsThisMonth = await db.board.count({
      where: {
        companyId: targetCompanyId, // 🔒 CRITICAL: Filter by company
        OR: [
          { access: { has: session.user.id } },
          { createdBy: session.user.id },
        ],
        createdAt: { gte: monthStart },
      },
    });

    const weekOverWeek =
      boardsLastWeek > 0
        ? ((boardsCreatedThisWeek - boardsLastWeek) / boardsLastWeek) * 100
        : 0;
    const monthOverMonth =
      boardsLastMonth > 0
        ? ((boardsThisMonth - boardsLastMonth) / boardsLastMonth) * 100
        : 0;

        const result: BoardMetricsData = {
          totalBoards,
          activeBoardsCount,
          boardsWithTasks,
          averageTasksPerBoard,
          mostActiveBoards,
          boardActivity: {
            created: boardsCreatedThisWeek,
            updated: boardsUpdatedThisWeek,
            archived: 0, // TODO: Implement if archived status is added
          },
          sectionDistribution,
          trends: {
            weekOverWeek: Math.round(weekOverWeek * 100) / 100,
            monthOverMonth: Math.round(monthOverMonth * 100) / 100,
          },
        };

        return result;
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Validation failed" };
    }
    console.error("Board metrics error:", error);
    return { success: false, error: "Failed to retrieve board metrics" };
  }
}
