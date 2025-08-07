"use server"

import { auth } from "@/auth"
import db from "@/lib/db"
import { z } from "zod"

const UserMetricsSchema = z.object({
  cid: z.string().min(1, "Company ID is required")
})

export interface UserMetrics {
  totalUsers: number
  activeUsers: number
  userActivitySummary: {
    userId: string
    userName: string | null
    email: string
    tasksAssigned: number
    tasksCompleted: number
    tasksCreated: number
    productivityScore: number
    lastActive: Date | null
  }[]
  teamProductivity: {
    totalTasksAssigned: number
    totalTasksCompleted: number
    averageCompletionRate: number
    mostProductiveUser: {
      id: string
      name: string | null
      email: string
      completionRate: number
    } | null
  }
  aiUsageStats: {
    totalConversations: number
    activeAIUsers: number
    averageConversationsPerUser: number
  }
  documentStats: {
    totalDocuments: number
    documentsByUser: number
    averageProcessingSuccessRate: number
  }
}

export async function getUserMetrics(cid: string): Promise<{ success: boolean; data?: UserMetrics; error?: string }> {
  try {
    // Session validation
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Authentication required' }
    }

    // Input validation
    const validatedData = UserMetricsSchema.parse({ cid })
    
    // Company data isolation check
    if (session.user.cid !== validatedData.cid) {
      return { success: false, error: 'Unauthorized access to company data' }
    }

    // Get all users in the company
    const companyUsers = await db.user.findMany({
      where: { cid },
      include: {
        assignedTasks: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true
          }
        },
        createdTasks: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        aiConversations: {
          select: {
            id: true,
            createdAt: true
          }
        },
        documents: {
          select: {
            id: true,
            confidence: true,
            processedAt: true
          }
        },
        securityAuditLogs: {
          select: {
            timestamp: true
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    })

    const totalUsers = companyUsers.length

    if (totalUsers === 0) {
      const emptyMetrics: UserMetrics = {
        totalUsers: 0,
        activeUsers: 0,
        userActivitySummary: [],
        teamProductivity: {
          totalTasksAssigned: 0,
          totalTasksCompleted: 0,
          averageCompletionRate: 0,
          mostProductiveUser: null
        },
        aiUsageStats: {
          totalConversations: 0,
          activeAIUsers: 0,
          averageConversationsPerUser: 0
        },
        documentStats: {
          totalDocuments: 0,
          documentsByUser: 0,
          averageProcessingSuccessRate: 0
        }
      }
      return { success: true, data: emptyMetrics }
    }

    // Calculate user activity summary
    const userActivitySummary = companyUsers.map(user => {
      const assignedTasks = user.assignedTasks.length
      const completedTasks = user.assignedTasks.filter(task => task.status === 'COMPLETED').length
      const createdTasks = user.createdTasks.length
      
      // Calculate productivity score (0-100 based on completion rate and activity)
      const completionRate = assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0
      const activityFactor = Math.min((assignedTasks + createdTasks) / 10, 1) // Max factor of 1 for 10+ tasks
      const productivityScore = completionRate * activityFactor

      // Get last activity from security audit logs
      const lastActive = user.securityAuditLogs.length > 0 
        ? user.securityAuditLogs[0].timestamp 
        : null

      return {
        userId: user.id,
        userName: user.name,
        email: user.email,
        tasksAssigned: assignedTasks,
        tasksCompleted: completedTasks,
        tasksCreated: createdTasks,
        productivityScore: Math.round(productivityScore),
        lastActive
      }
    })

    // Calculate team productivity
    const totalTasksAssigned = userActivitySummary.reduce((sum, user) => sum + user.tasksAssigned, 0)
    const totalTasksCompleted = userActivitySummary.reduce((sum, user) => sum + user.tasksCompleted, 0)
    const averageCompletionRate = totalTasksAssigned > 0 ? (totalTasksCompleted / totalTasksAssigned) * 100 : 0

    // Find most productive user
    const mostProductiveUser = userActivitySummary.length > 0
      ? userActivitySummary.reduce((max, user) => {
          const currentRate = user.tasksAssigned > 0 ? (user.tasksCompleted / user.tasksAssigned) * 100 : 0
          const maxRate = max.tasksAssigned > 0 ? (max.tasksCompleted / max.tasksAssigned) * 100 : 0
          return currentRate > maxRate ? user : max
        })
      : null

    const mostProductiveUserFormatted = mostProductiveUser ? {
      id: mostProductiveUser.userId,
      name: mostProductiveUser.userName,
      email: mostProductiveUser.email,
      completionRate: mostProductiveUser.tasksAssigned > 0 
        ? (mostProductiveUser.tasksCompleted / mostProductiveUser.tasksAssigned) * 100 
        : 0
    } : null

    // Calculate AI usage statistics
    const totalConversations = companyUsers.reduce((sum, user) => sum + user.aiConversations.length, 0)
    const activeAIUsers = companyUsers.filter(user => user.aiConversations.length > 0).length
    const averageConversationsPerUser = totalUsers > 0 ? totalConversations / totalUsers : 0

    // Calculate document statistics
    const totalDocuments = companyUsers.reduce((sum, user) => sum + user.documents.length, 0)
    const documentsWithUsers = companyUsers.filter(user => user.documents.length > 0).length
    
    // Calculate processing success rate (confidence > 0.7 considered successful)
    const allDocuments = companyUsers.flatMap(user => user.documents)
    const successfulProcessing = allDocuments.filter(doc => doc.confidence > 0.7).length
    const averageProcessingSuccessRate = totalDocuments > 0 
      ? (successfulProcessing / totalDocuments) * 100 
      : 0

    // Determine active users (users with recent activity within last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUsers = userActivitySummary.filter(user => 
      user.lastActive && user.lastActive >= thirtyDaysAgo
    ).length

    const metrics: UserMetrics = {
      totalUsers,
      activeUsers,
      userActivitySummary,
      teamProductivity: {
        totalTasksAssigned,
        totalTasksCompleted,
        averageCompletionRate,
        mostProductiveUser: mostProductiveUserFormatted
      },
      aiUsageStats: {
        totalConversations,
        activeAIUsers,
        averageConversationsPerUser
      },
      documentStats: {
        totalDocuments,
        documentsByUser: documentsWithUsers,
        averageProcessingSuccessRate
      }
    }

    return { success: true, data: metrics }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation failed'
      }
    }
    
    console.error('User metrics error:', error)
    return { success: false, error: 'Failed to fetch user metrics' }
  }
}