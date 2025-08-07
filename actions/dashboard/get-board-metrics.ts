"use server"

import { auth } from "@/auth"
import db from "@/lib/db"
import { z } from "zod"

const BoardMetricsSchema = z.object({
  cid: z.string().min(1, "Company ID is required")
})

export interface BoardMetrics {
  totalBoards: number
  activeBoardsWithTasks: number
  boardsCreatedThisMonth: number
  averageTasksPerBoard: number
  mostActiveBoard: {
    id: string
    name: string
    taskCount: number
  } | null
  boardUtilization: {
    boardId: string
    boardName: string
    taskCount: number
    completionRate: number
  }[]
  trendData: {
    boardsCreated: number
    percentChange: number
  }
}

export async function getBoardMetrics(cid: string): Promise<{ success: boolean; data?: BoardMetrics; error?: string }> {
  try {
    // Session validation
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Authentication required' }
    }

    // Input validation
    const validatedData = BoardMetricsSchema.parse({ cid })
    
    // Company data isolation check
    if (session.user.cid !== validatedData.cid) {
      return { success: false, error: 'Unauthorized access to company data' }
    }

    // Get company users for filtering
    const companyUsers = await db.user.findMany({
      where: { cid },
      select: { id: true }
    })
    const userIds = companyUsers.map(user => user.id)

    if (userIds.length === 0) {
      // No users in company, return empty metrics
      const emptyMetrics: BoardMetrics = {
        totalBoards: 0,
        activeBoardsWithTasks: 0,
        boardsCreatedThisMonth: 0,
        averageTasksPerBoard: 0,
        mostActiveBoard: null,
        boardUtilization: [],
        trendData: {
          boardsCreated: 0,
          percentChange: 0
        }
      }
      return { success: true, data: emptyMetrics }
    }

    // Date boundaries for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get all boards created by company users
    const allBoards = await db.board.findMany({
      where: {
        createdBy: { in: userIds }
      },
      include: {
        boardSections: {
          include: {
            tasks: {
              include: {
                createdBy: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Parallel queries for month-based metrics
    const [
      boardsThisMonth,
      boardsLastMonth
    ] = await Promise.all([
      db.board.count({
        where: {
          createdBy: { in: userIds },
          createdAt: { gte: startOfMonth }
        }
      }),
      
      db.board.count({
        where: {
          createdBy: { in: userIds },
          createdAt: { 
            gte: lastMonth,
            lte: endOfLastMonth
          }
        }
      })
    ])

    // Calculate metrics
    const totalBoards = allBoards.length

    // Calculate board utilization and find most active board
    const boardUtilization = allBoards.map(board => {
      const allTasks = board.boardSections.flatMap(section => section.tasks)
      const completedTasks = allTasks.filter(task => task.status === 'COMPLETED')
      const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0

      return {
        boardId: board.id,
        boardName: board.name,
        taskCount: allTasks.length,
        completionRate
      }
    })

    // Boards with tasks
    const activeBoardsWithTasks = boardUtilization.filter(board => board.taskCount > 0).length

    // Average tasks per board
    const totalTasks = boardUtilization.reduce((sum, board) => sum + board.taskCount, 0)
    const averageTasksPerBoard = totalBoards > 0 ? totalTasks / totalBoards : 0

    // Most active board
    const mostActiveBoard = boardUtilization.length > 0 
      ? boardUtilization.reduce((max, board) => 
          board.taskCount > max.taskCount ? board : max
        )
      : null

    // Convert to expected format
    const mostActiveBoardFormatted = mostActiveBoard ? {
      id: mostActiveBoard.boardId,
      name: mostActiveBoard.boardName,
      taskCount: mostActiveBoard.taskCount
    } : null

    // Trend calculation (current month vs last month)
    const percentChange = boardsLastMonth > 0 
      ? ((boardsThisMonth - boardsLastMonth) / boardsLastMonth) * 100 
      : boardsThisMonth > 0 ? 100 : 0

    const metrics: BoardMetrics = {
      totalBoards,
      activeBoardsWithTasks,
      boardsCreatedThisMonth: boardsThisMonth,
      averageTasksPerBoard,
      mostActiveBoard: mostActiveBoardFormatted,
      boardUtilization,
      trendData: {
        boardsCreated: boardsThisMonth,
        percentChange
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
    
    console.error('Board metrics error:', error)
    return { success: false, error: 'Failed to fetch board metrics' }
  }
}