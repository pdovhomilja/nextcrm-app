"use server"

import { auth } from "@/auth"
import db from "@/lib/db"
import { z } from 'zod/v3';

const UserMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  includeActivity: z.boolean().optional().default(true),
})

export type UserMetricsData = {
  totalUsers: number
  activeUsersCount: number
  newUsersThisMonth: number
  userProductivity: {
    avgTasksPerUser: number
    avgCompletionRate: number
    topPerformers: Array<{
      id: string
      name: string | null
      email: string
      tasksCompleted: number
      completionRate: number
    }>
  }
  activityBreakdown: {
    daily: number[]
    weekly: number[]
    loginFrequency: {
      daily: number
      weekly: number
      monthly: number
    }
  }
  roleDistribution: {
    [key: string]: number
  }
  trends: {
    activeUsersGrowth: number
    productivityTrend: number
  }
}

export async function getUserMetrics(
  input?: z.infer<typeof UserMetricsSchema>
): Promise<{ data?: UserMetricsData; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { error: "Authentication required" }
    }

    const companyId = session.user.activeCompanyId
    if (!companyId) {
      return { error: "Company context required" }
    }

    const validatedInput = UserMetricsSchema.parse(input || {})
    const { dateRange, includeActivity } = validatedInput

    // Calculate date filter
    const now = new Date()
    let dateFilter: Date | undefined

    switch (dateRange) {
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        dateFilter = undefined
    }

    // Get total users in company
    const totalUsers = await db.user.count({
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        }
      },
    })

    // Get users with recent activity (active users)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const usersWithRecentActivity = await db.user.findMany({
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        },
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
            updatedAt: { gte: weekAgo },
          },
        ],
      },
      select: {
        id: true,
        updatedAt: true,
      },
    })

    const activeUsersCount = usersWithRecentActivity.length

    // Get new users this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const newUsersThisMonth = await db.user.count({
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        },
        createdAt: { gte: monthStart },
      },
    })

    // Get user productivity data
    const usersWithTaskData = await db.user.findMany({
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        },
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
            ...(dateFilter && { updatedAt: { gte: dateFilter } }),
          },
          select: {
            id: true,
            updatedAt: true,
          },
        },
      },
    })

    // Calculate productivity metrics
    const totalAssignedTasks = usersWithTaskData.reduce(
      (sum, user) => sum + user._count.assignedTasks,
      0
    )
    const totalCompletedTasks = usersWithTaskData.reduce(
      (sum, user) => sum + user.assignedTasks.length,
      0
    )

    const avgTasksPerUser =
      totalUsers > 0 ? Math.round(totalAssignedTasks / totalUsers) : 0
    const avgCompletionRate =
      totalAssignedTasks > 0
        ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
        : 0

    // Get top performers (top 5)
    const topPerformers = usersWithTaskData
      .map((user) => {
        const tasksCompleted = user.assignedTasks.length
        const totalAssigned = user._count.assignedTasks
        const completionRate =
          totalAssigned > 0
            ? Math.round((tasksCompleted / totalAssigned) * 100)
            : 0

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          tasksCompleted,
          completionRate,
        }
      })
      .filter((user) => user.tasksCompleted > 0) // Only include users with completed tasks
      .sort((a, b) => {
        // Sort by completion rate first, then by tasks completed
        if (a.completionRate !== b.completionRate) {
          return b.completionRate - a.completionRate
        }
        return b.tasksCompleted - a.tasksCompleted
      })
      .slice(0, 5)

    // Activity breakdown (simplified version)
    let activityBreakdown = {
      daily: [] as number[],
      weekly: [] as number[],
      loginFrequency: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    }

    if (includeActivity) {
      // Daily login counts for last 7 days
      const dailyLogins = []
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

        const loginCount = await db.user.count({
          where: {
            memberships: {
          some: {
            companyId: companyId,
          }
        },
            updatedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        })

        dailyLogins.push(loginCount)
      }

      activityBreakdown.daily = dailyLogins

      // Login frequency
      const dailyLoginUsers = await db.user.count({
        where: {
          memberships: {
          some: {
            companyId: companyId,
          }
        },
          updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      })

      const weeklyLoginUsers = await db.user.count({
        where: {
          memberships: {
          some: {
            companyId: companyId,
          }
        },
          updatedAt: { gte: weekAgo },
        },
      })

      const monthlyLoginUsers = await db.user.count({
        where: {
          memberships: {
          some: {
            companyId: companyId,
          }
        },
          updatedAt: { gte: monthStart },
        },
      })

      activityBreakdown.loginFrequency = {
        daily: dailyLoginUsers,
        weekly: weeklyLoginUsers,
        monthly: monthlyLoginUsers,
      }
    }

    // Role distribution
    const roleDistribution = await db.user.groupBy({
      by: ["role"],
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        },
      },
      _count: {
        id: true,
      },
    })

    const roleBreakdown: { [key: string]: number } = {}
    roleDistribution.forEach((item) => {
      roleBreakdown[item.role] = item._count.id
    })

    // Calculate trends
    const lastMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1
    )
    const activeUsersLastMonth = await db.user.count({
      where: {
        memberships: {
          some: {
            companyId: companyId,
          }
        },
        updatedAt: { gte: lastMonth, lt: monthStart },
      },
    })

    const activeUsersGrowth =
      activeUsersLastMonth > 0
        ? ((activeUsersCount - activeUsersLastMonth) / activeUsersLastMonth) *
          100
        : 0

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
    }

    return { data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Validation failed" }
    }
    console.error("User metrics error:", error)
    return { error: "Failed to retrieve user metrics" }
  }
}