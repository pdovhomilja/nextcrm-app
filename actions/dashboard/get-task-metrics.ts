"use server"

import { auth } from "@/auth"
import db from "@/lib/db"
import { z } from "zod"

const TaskMetricsSchema = z.object({
  cid: z.string().min(1, "Company ID is required")
})

export interface TaskMetrics {
  totalTasks: number
  tasksByStatus: {
    NEW: number
    IN_PROGRESS: number
    COMPLETED: number
    CANCELLED: number
    ON_HOLD: number
  }
  overdueTasks: number
  tasksThisWeek: number
  tasksThisMonth: number
  completionRate: number
  avgCompletionTimeHours: number
  priorityDistribution: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  trendData: {
    tasksCreated: number
    tasksCompleted: number
    percentChange: number
  }
}

export async function getTaskMetrics(cid: string): Promise<{ success: boolean; data?: TaskMetrics; error?: string }> {
  try {
    // Session validation
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Authentication required' }
    }

    // Input validation
    const validatedData = TaskMetricsSchema.parse({ cid })
    
    // Company data isolation check
    if (session.user.cid !== validatedData.cid) {
      return { success: false, error: 'Unauthorized access to company data' }
    }

    // Get current date boundaries for filtering
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Parallel database queries for better performance
    const [
      allTasks,
      overdueTasks,
      weeklyTasks,
      monthlyTasks,
      lastMonthTasks,
      completedTasksWithDuration
    ] = await Promise.all([
      // Get all tasks for the company
      db.task.findMany({
        where: {
          createdById: { in: await getUsersInCompany(cid) }
        },
        include: {
          createdBy: true,
          assignedTo: true
        }
      }),
      
      // Get overdue tasks
      db.task.count({
        where: {
          createdById: { in: await getUsersInCompany(cid) },
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      
      // Tasks created this week
      db.task.count({
        where: {
          createdById: { in: await getUsersInCompany(cid) },
          createdAt: { gte: startOfWeek }
        }
      }),
      
      // Tasks created this month
      db.task.count({
        where: {
          createdById: { in: await getUsersInCompany(cid) },
          createdAt: { gte: startOfMonth }
        }
      }),
      
      // Tasks created last month for trend comparison
      db.task.count({
        where: {
          createdById: { in: await getUsersInCompany(cid) },
          createdAt: { 
            gte: lastMonth,
            lte: endOfLastMonth
          }
        }
      }),
      
      // Completed tasks with creation and completion times for duration calculation
      db.task.findMany({
        where: {
          createdById: { in: await getUsersInCompany(cid) },
          status: 'COMPLETED'
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      })
    ])

    // Helper function to get user IDs in company
    async function getUsersInCompany(companyId: string): Promise<string[]> {
      const users = await db.user.findMany({
        where: { cid: companyId },
        select: { id: true }
      })
      return users.map(user => user.id)
    }

    // Calculate metrics
    const totalTasks = allTasks.length
    
    // Tasks by status
    const tasksByStatus = {
      NEW: allTasks.filter(task => task.status === 'NEW').length,
      IN_PROGRESS: allTasks.filter(task => task.status === 'IN_PROGRESS').length,
      COMPLETED: allTasks.filter(task => task.status === 'COMPLETED').length,
      CANCELLED: allTasks.filter(task => task.status === 'CANCELLED').length,
      ON_HOLD: allTasks.filter(task => task.status === 'ON_HOLD').length,
    }

    // Priority distribution
    const priorityDistribution = {
      LOW: allTasks.filter(task => task.priority === 'LOW').length,
      MEDIUM: allTasks.filter(task => task.priority === 'MEDIUM').length,
      HIGH: allTasks.filter(task => task.priority === 'HIGH').length,
      CRITICAL: allTasks.filter(task => task.priority === 'CRITICAL').length,
    }

    // Completion rate (completed vs total)
    const completedTasks = tasksByStatus.COMPLETED
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Average completion time in hours
    const avgCompletionTimeHours = completedTasksWithDuration.length > 0 
      ? completedTasksWithDuration.reduce((sum, task) => {
          const hours = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / completedTasksWithDuration.length
      : 0

    // Trend calculation (current month vs last month)
    const percentChange = lastMonthTasks > 0 
      ? ((monthlyTasks - lastMonthTasks) / lastMonthTasks) * 100 
      : monthlyTasks > 0 ? 100 : 0

    const metrics: TaskMetrics = {
      totalTasks,
      tasksByStatus,
      overdueTasks,
      tasksThisWeek: weeklyTasks,
      tasksThisMonth: monthlyTasks,
      completionRate,
      avgCompletionTimeHours,
      priorityDistribution,
      trendData: {
        tasksCreated: monthlyTasks,
        tasksCompleted: tasksByStatus.COMPLETED,
        percentChange
      }
    }

    return { success: true, data: metrics }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation failed', 
      }
    }
    
    console.error('Task metrics error:', error)
    return { success: false, error: 'Failed to fetch task metrics' }
  }
}

// Helper function to get users in company (avoiding duplication)
async function getUsersInCompany(companyId: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: { cid: companyId },
    select: { id: true }
  })
  return users.map(user => user.id)
}