# Phase 1B: Board & User Metrics Implementation

## Phase Overview

**Objective**: Implement board analytics and user activity tracking to complete the foundational dashboard metrics.

**Duration**: 3-4 days

**Prerequisites**: Phase 1A completed (task metrics infrastructure)

**Success Criteria**:

- Board metrics action and component implemented
- User activity tracking functional
- All section cards display real data
- Performance optimized for multi-metric dashboard

## Technical Implementation

### Step 1: Create Board Metrics Action

Create `actions/dashboard/get-board-metrics.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

const BoardMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  includeSections: z.boolean().optional().default(true),
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
  input?: z.infer<typeof BoardMetricsSchema>,
): Promise<{ data?: BoardMetricsData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = BoardMetricsSchema.parse(input || {});
    const { dateRange, includeSections } = validatedInput;

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

    // Get total boards for company
    const totalBoards = await db.board.count({
      where: {
        companyId,
        ...(dateFilter && { createdAt: { gte: dateFilter } }),
      },
    });

    // Get boards with tasks (active boards)
    const boardsWithTasksQuery = await db.board.findMany({
      where: {
        companyId,
      },
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
        ...(includeSections && {
          sections: {
            select: {
              id: true,
            },
          },
        }),
      },
    });

    const boardsWithTasks = boardsWithTasksQuery.filter(
      (board) => board._count.tasks > 0,
    ).length;
    const activeBoardsCount = boardsWithTasksQuery.filter((board) => {
      const lastActivity = board.tasks[0]?.updatedAt;
      if (!lastActivity) return false;
      const daysSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActivity <= 7; // Active in last 7 days
    }).length;

    // Calculate average tasks per board
    const totalTasksAcrossBoards = boardsWithTasksQuery.reduce(
      (sum, board) => sum + board._count.tasks,
      0,
    );
    const averageTasksPerBoard =
      totalBoards > 0 ? Math.round(totalTasksAcrossBoards / totalBoards) : 0;

    // Get most active boards (top 5)
    const mostActiveBoards = boardsWithTasksQuery
      .map((board) => ({
        id: board.id,
        title: board.title,
        taskCount: board._count.tasks,
        sectionCount: includeSections ? board.sections?.length || 0 : 0,
        lastActivity: board.tasks[0]?.updatedAt || board.updatedAt,
      }))
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
        companyId,
        createdAt: { gte: weekStart },
      },
    });

    const boardsUpdatedThisWeek = await db.board.count({
      where: {
        companyId,
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
            companyId,
          },
        },
      });

      const sectionsWithTasks = await db.boardSection.count({
        where: {
          board: {
            companyId,
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
        companyId,
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
        companyId,
        createdAt: { gte: lastMonthStart, lt: monthStart },
      },
    });

    const boardsThisMonth = await db.board.count({
      where: {
        companyId,
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

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Validation failed" };
    }
    console.error("Board metrics error:", error);
    return { error: "Failed to retrieve board metrics" };
  }
}
```

### Step 2: Create User Activity Metrics Action

Create `actions/dashboard/get-user-metrics.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

const UserMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  includeActivity: z.boolean().optional().default(true),
});

export type UserMetricsData = {
  totalUsers: number;
  activeUsersCount: number;
  newUsersThisMonth: number;
  userProductivity: {
    avgTasksPerUser: number;
    avgCompletionRate: number;
    topPerformers: Array<{
      id: string;
      name: string | null;
      email: string;
      tasksCompleted: number;
      completionRate: number;
    }>;
  };
  activityBreakdown: {
    daily: number[];
    weekly: number[];
    loginFrequency: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  roleDistribution: {
    [key: string]: number;
  };
  trends: {
    activeUsersGrowth: number;
    productivityTrend: number;
  };
};

export async function getUserMetrics(
  input?: z.infer<typeof UserMetricsSchema>,
): Promise<{ data?: UserMetricsData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = UserMetricsSchema.parse(input || {});
    const { dateRange, includeActivity } = validatedInput;

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

    // Get total users in company
    const totalUsers = await db.user.count({
      where: {
        cid: companyId,
      },
    });

    // Get users with recent activity (active users)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const usersWithRecentActivity = await db.user.findMany({
      where: {
        cid: companyId,
        OR: [
          {
            assignedTasks: {
              some: {
                updatedAt: { gte: weekAgo },
              },
            },
          },
          {
            createdTasks: {
              some: {
                updatedAt: { gte: weekAgo },
              },
            },
          },
          {
            lastLogin: { gte: weekAgo },
          },
        ],
      },
      select: {
        id: true,
        lastLogin: true,
      },
    });

    const activeUsersCount = usersWithRecentActivity.length;

    // Get new users this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = await db.user.count({
      where: {
        cid: companyId,
        createdAt: { gte: monthStart },
      },
    });

    // Get user productivity data
    const usersWithTaskData = await db.user.findMany({
      where: {
        cid: companyId,
      },
      include: {
        _count: {
          select: {
            assignedTasks: {
              where: dateFilter
                ? { createdAt: { gte: dateFilter } }
                : undefined,
            },
          },
        },
        assignedTasks: {
          where: {
            status: "COMPLETED",
            ...(dateFilter && { completedAt: { gte: dateFilter } }),
          },
          select: {
            id: true,
            completedAt: true,
          },
        },
      },
    });

    // Calculate productivity metrics
    const totalAssignedTasks = usersWithTaskData.reduce(
      (sum, user) => sum + user._count.assignedTasks,
      0,
    );
    const totalCompletedTasks = usersWithTaskData.reduce(
      (sum, user) => sum + user.assignedTasks.length,
      0,
    );

    const avgTasksPerUser =
      totalUsers > 0 ? Math.round(totalAssignedTasks / totalUsers) : 0;
    const avgCompletionRate =
      totalAssignedTasks > 0
        ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
        : 0;

    // Get top performers (top 5)
    const topPerformers = usersWithTaskData
      .map((user) => {
        const tasksCompleted = user.assignedTasks.length;
        const totalAssigned = user._count.assignedTasks;
        const completionRate =
          totalAssigned > 0
            ? Math.round((tasksCompleted / totalAssigned) * 100)
            : 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tasksCompleted,
          completionRate,
        };
      })
      .filter((user) => user.tasksCompleted > 0) // Only include users with completed tasks
      .sort((a, b) => {
        // Sort by completion rate first, then by tasks completed
        if (a.completionRate !== b.completionRate) {
          return b.completionRate - a.completionRate;
        }
        return b.tasksCompleted - a.tasksCompleted;
      })
      .slice(0, 5);

    // Activity breakdown (simplified version)
    let activityBreakdown = {
      daily: [] as number[],
      weekly: [] as number[],
      loginFrequency: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    };

    if (includeActivity) {
      // Daily login counts for last 7 days
      const dailyLogins = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const loginCount = await db.user.count({
          where: {
            cid: companyId,
            lastLogin: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        });

        dailyLogins.push(loginCount);
      }

      activityBreakdown.daily = dailyLogins;

      // Login frequency
      const dailyLoginUsers = await db.user.count({
        where: {
          cid: companyId,
          lastLogin: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });

      const weeklyLoginUsers = await db.user.count({
        where: {
          cid: companyId,
          lastLogin: { gte: weekAgo },
        },
      });

      const monthlyLoginUsers = await db.user.count({
        where: {
          cid: companyId,
          lastLogin: { gte: monthStart },
        },
      });

      activityBreakdown.loginFrequency = {
        daily: dailyLoginUsers,
        weekly: weeklyLoginUsers,
        monthly: monthlyLoginUsers,
      };
    }

    // Role distribution
    const roleDistribution = await db.user.groupBy({
      by: ["role"],
      where: {
        cid: companyId,
      },
      _count: {
        id: true,
      },
    });

    const roleBreakdown: { [key: string]: number } = {};
    roleDistribution.forEach((item) => {
      roleBreakdown[item.role] = item._count.id;
    });

    // Calculate trends
    const lastMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1,
    );
    const activeUsersLastMonth = await db.user.count({
      where: {
        cid: companyId,
        lastLogin: { gte: lastMonth, lt: monthStart },
      },
    });

    const activeUsersGrowth =
      activeUsersLastMonth > 0
        ? ((activeUsersCount - activeUsersLastMonth) / activeUsersLastMonth) *
          100
        : 0;

    const result: UserMetricsData = {
      totalUsers,
      activeUsersCount,
      newUsersThisMonth,
      userProductivity: {
        avgTasksPerUser,
        avgCompletionRate,
        topPerformers,
      },
      activityBreakdown,
      roleDistribution: roleBreakdown,
      trends: {
        activeUsersGrowth: Math.round(activeUsersGrowth * 100) / 100,
        productivityTrend: 0, // TODO: Calculate productivity trend
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Validation failed" };
    }
    console.error("User metrics error:", error);
    return { error: "Failed to retrieve user metrics" };
  }
}
```

### Step 3: Create Board Metrics Component

Create `components/dashboard/metrics/board-metrics-card.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getBoardMetrics, type BoardMetricsData } from "@/actions/dashboard/get-board-metrics"
import { Folder, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface BoardMetricsCardProps {
  dateRange?: '7d' | '30d' | '90d' | 'all'
  className?: string
}

export function BoardMetricsCard({ dateRange = '30d', className }: BoardMetricsCardProps) {
  const [data, setData] = useState<BoardMetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getBoardMetrics({ dateRange })

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch board metrics:', err)
        setError('Failed to load board metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [dateRange])

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-gray-400"
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Board Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Active Projects
        </CardTitle>
        <CardDescription>
          {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main metric */}
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{data.totalBoards.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.monthOverMonth)}`}>
              {getTrendIcon(data.trends.monthOverMonth)}
              <span>{Math.abs(data.trends.monthOverMonth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Activity breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Active: {data.activeBoardsCount}
            </Badge>
            <Badge variant="outline" className="text-xs">
              With Tasks: {data.boardsWithTasks}
            </Badge>
            {data.sectionDistribution.totalSections > 0 && (
              <Badge variant="outline" className="text-xs">
                {data.sectionDistribution.totalSections} sections
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Avg. tasks/board: {data.averageTasksPerBoard}</div>
            {data.sectionDistribution.averageSectionsPerBoard > 0 && (
              <div>Avg. sections/board: {data.sectionDistribution.averageSectionsPerBoard}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 4: Create User Activity Component

Create `components/dashboard/metrics/user-activity-card.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserMetrics, type UserMetricsData } from "@/actions/dashboard/get-user-metrics"
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface UserActivityCardProps {
  dateRange?: '7d' | '30d' | '90d' | 'all'
  className?: string
}

export function UserActivityCard({ dateRange = '30d', className }: UserActivityCardProps) {
  const [data, setData] = useState<UserMetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getUserMetrics({ dateRange })

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch user metrics:', err)
        setError('Failed to load user metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [dateRange])

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-gray-400"
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Activity
        </CardTitle>
        <CardDescription>
          {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main metric */}
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{data.activeUsersCount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              / {data.totalUsers} total
            </div>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.activeUsersGrowth)}`}>
              {getTrendIcon(data.trends.activeUsersGrowth)}
              <span>{Math.abs(data.trends.activeUsersGrowth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Activity breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Daily: {data.activityBreakdown.loginFrequency.daily}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Weekly: {data.activityBreakdown.loginFrequency.weekly}
            </Badge>
            {data.newUsersThisMonth > 0 && (
              <Badge variant="outline" className="text-xs">
                New: {data.newUsersThisMonth}
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Avg. tasks/user: {data.userProductivity.avgTasksPerUser}</div>
            <div>Completion rate: {data.userProductivity.avgCompletionRate}%</div>
            {data.userProductivity.topPerformers.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span>Top performer:</span>
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-xs">
                    {data.userProductivity.topPerformers[0]?.name?.charAt(0) ||
                     data.userProductivity.topPerformers[0]?.email?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span>{data.userProductivity.topPerformers[0]?.completionRate}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 5: Update Section Cards with All Real Data

Update `app/(app)/[cid]/dashboard/_components/section-cards.tsx`:

```typescript
import { TaskMetricsCard } from "@/components/dashboard/metrics/task-metrics-card"
import { BoardMetricsCard } from "@/components/dashboard/metrics/board-metrics-card"
import { UserActivityCard } from "@/components/dashboard/metrics/user-activity-card"

export function SectionCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <TaskMetricsCard className="w-full" />
      <BoardMetricsCard className="w-full" />
      <UserActivityCard className="w-full" />
    </div>
  )
}
```

### Step 6: Performance Optimization

Create `actions/dashboard/get-dashboard-overview.ts` for combined metrics:

```typescript
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
      getBoardMetrics({ dateRange }),
      getUserMetrics({ dateRange }),
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
```

## Testing and Verification

### Unit Tests

Create tests for each new action:

```typescript
// __tests__/dashboard/get-board-metrics.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBoardMetrics } from "@/actions/dashboard/get-board-metrics";

// Similar structure to task metrics tests
describe("getBoardMetrics", () => {
  // Test authentication, company filtering, data calculations
});

// __tests__/dashboard/get-user-metrics.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserMetrics } from "@/actions/dashboard/get-user-metrics";

describe("getUserMetrics", () => {
  // Test user activity calculations, role distributions
});
```

### Integration Testing

Test dashboard with real data:

```typescript
// __tests__/dashboard/dashboard-integration.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import { SectionCards } from '@/app/(app)/[cid]/dashboard/_components/section-cards'

describe('Dashboard Integration', () => {
  it('should load all metric cards successfully', async () => {
    render(<SectionCards />)

    await waitFor(() => {
      expect(screen.getByText('Total Tasks')).toBeInTheDocument()
      expect(screen.getByText('Active Projects')).toBeInTheDocument()
      expect(screen.getByText('Team Activity')).toBeInTheDocument()
    })
  })
})
```

## Completion Checklist

### Build & Quality Verification

- [ ] `pnpm build` passes without errors
- [ ] `pnpm lint` passes without warnings
- [ ] TypeScript compilation successful
- [ ] All imports and exports correct

### Security & Data Isolation

- [ ] All actions validate session with `auth()`
- [ ] All database queries filter by `cid` (company ID)
- [ ] Input validation with Zod schemas implemented
- [ ] Error handling follows TaskHQ patterns

### Performance & Database

- [ ] Queries use proper indexes
- [ ] Parallel data fetching implemented
- [ ] No memory leaks in React components
- [ ] Database connections use centralized `@/lib/db`

### UI/UX Standards

- [ ] Components use shadcn/ui styling
- [ ] Responsive design works on mobile
- [ ] Loading states implemented
- [ ] Error boundaries handle failures
- [ ] Accessibility maintained

### Testing

- [ ] Unit tests written for all actions
- [ ] Integration tests verify end-to-end flow
- [ ] Manual testing completed
- [ ] Edge cases and error conditions tested

## Files Created/Modified

### New Files

- `actions/dashboard/get-board-metrics.ts`
- `actions/dashboard/get-user-metrics.ts`
- `actions/dashboard/get-dashboard-overview.ts`
- `components/dashboard/metrics/board-metrics-card.tsx`
- `components/dashboard/metrics/user-activity-card.tsx`
- `__tests__/dashboard/get-board-metrics.test.ts`
- `__tests__/dashboard/get-user-metrics.test.ts`
- `__tests__/dashboard/dashboard-integration.test.ts`

### Modified Files

- `app/(app)/[cid]/dashboard/_components/section-cards.tsx`

## Next Phase Preparation

Phase 2A will build upon this foundation by:

- Replacing the visitor chart with task completion timeline
- Implementing interactive chart components
- Adding date range filtering to charts
- Establishing chart data processing patterns

Ensure the following are ready for Phase 2A:

- All dashboard metrics are working and tested
- Performance is optimized for multiple metrics
- Error handling is comprehensive
- Component patterns are established

## Troubleshooting Guide

### Performance Issues

- **Slow dashboard loading**: Check if queries are running in parallel
- **Database timeouts**: Verify proper indexing on frequently queried fields
- **Memory leaks**: Ensure useEffect cleanup in all components

### Data Accuracy Issues

- **Incorrect metrics**: Verify company ID filtering in all queries
- **Missing data**: Check user permissions and data relationships
- **Inconsistent trends**: Validate date range calculations

### Component Issues

- **Loading states stuck**: Check error handling in useEffect
- **Styling inconsistencies**: Verify shadcn/ui component usage
- **Responsive layout**: Test on different screen sizes

This completes Phase 1B implementation. All dashboard section cards now display real, company-scoped data with proper security and performance patterns.
