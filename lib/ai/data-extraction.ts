import db from "@/lib/db";
import { TaskPriority, TaskStatusNew } from "@/lib/generated/prisma";

export interface TaskDocument {
  id: string;
  content: string;
  metadata: {
    boardId: string;
    boardName: string;
    sectionId: string;
    sectionName: string;
    priority: TaskPriority;
    status: TaskStatusNew;
    assigneeIds: string[];
    assigneeNames: string[];
    creatorId: string;
    creatorName: string;
    createdAt: Date;
    updatedAt: Date;
    dueDate: Date;
    companyId: string;
    tags: string[];
    estimatedHours?: number;
    completedAt?: Date;
  };
}

export interface BoardDocument {
  id: string;
  content: string;
  metadata: {
    name: string;
    description?: string;
    createdBy: string;
    teamMembers: string[];
    sectionsCount: number;
    tasksCount: number;
    completionRate: number;
    avgTaskDuration: number;
    priorityDistribution: Record<TaskPriority, number>;
    statusDistribution: Record<TaskStatusNew, number>;
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
  };
}

export class DataExtractionService {
  /**
   * Extract and format task data for embedding
   */
  async extractTaskData(taskId: string, companyId?: string): Promise<TaskDocument | null> {
    let whereClause: { id: string; assignedTo?: { memberships: { some: { companyId: string } } } } = { id: taskId };
    
    // Add company filtering if companyId is provided
    if (companyId) {
      whereClause = {
        id: taskId,
        assignedTo: {
          memberships: { some: { companyId: companyId } } // Ensure task's assignee belongs to the company
        }
      };
    }

    const task = await db.task.findFirst({
      where: whereClause,
      include: {
        assignedTo: true,
        createdBy: true,
        boardSection: {
          include: {
            board: {
              include: {
                _count: {
                  select: {
                    boardSections: true,
                  },
                },
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          take: 5, // Recent history for context
        },
      },
    });

    if (!task) return null;

    // Build content string for embedding
    const contentParts = [
      `Title: ${task.title}`,
      task.description ? `Description: ${task.description}` : "",
      `Priority: ${task.priority}`,
      `Status: ${task.status}`,
      `Board: ${task.boardSection.board.name}`,
      `Section: ${task.boardSection.name}`,
      `Assigned to: ${task.assignedTo.name}`,
      `Created by: ${task.createdBy.name}`,
      `Due date: ${task.dueDate.toISOString().split("T")[0]}`,
    ];

    // Add recent history context
    if (task.history.length > 0) {
      const historyContext = task.history
        .map((h) => `${h.description}`)
        .filter(Boolean)
        .join("; ");
      if (historyContext) {
        contentParts.push(`Recent activity: ${historyContext}`);
      }
    }

    const content = contentParts.filter(Boolean).join("\n");

    return {
      id: task.id,
      content,
      metadata: {
        boardId: task.boardSection.board.id,
        boardName: task.boardSection.board.name,
        sectionId: task.boardSection.id,
        sectionName: task.boardSection.name,
        priority: task.priority,
        status: task.status,
        assigneeIds: [task.assignedTo.id],
        assigneeNames: [task.assignedTo.name || ""],
        creatorId: task.createdBy.id,
        creatorName: task.createdBy.name || "",
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        companyId: companyId || "",
        tags: [], // Will be enhanced later
      },
    };
  }

  /**
   * Extract and format board data for embedding
   */
  async extractBoardData(boardId: string, companyId?: string): Promise<BoardDocument | null> {
    let whereClause: { id: string; access?: { hasSome: string[] } } = { id: boardId };
    
    // Add company filtering if companyId is provided
    if (companyId) {
      // First get users from the company
      const companyUsers = await db.user.findMany({
        where: { memberships: { some: { companyId: companyId } } },
        select: { id: true },
      });
      const userIds = companyUsers.map((user) => user.id);
      
      whereClause = {
        id: boardId,
        access: {
          hasSome: userIds // Board must have at least one company user in access
        }
      };
    }

    const board = await db.board.findFirst({
      where: whereClause,
      include: {
        boardSections: {
          include: {
            tasks: {
              include: {
                assignedTo: true,
                createdBy: true,
              },
            },
          },
        },
        _count: {
          select: {
            boardSections: true,
          },
        },
      },
    });

    if (!board) return null;

    const allTasks = board.boardSections.flatMap((section) => section.tasks);
    const completedTasks = allTasks.filter(
      (task) => task.status === "COMPLETED"
    );

    // Calculate metrics
    const completionRate =
      allTasks.length > 0 ? completedTasks.length / allTasks.length : 0;

    const avgTaskDuration =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, task) => {
            const duration =
              task.updatedAt.getTime() - task.createdAt.getTime();
            return sum + duration;
          }, 0) /
          completedTasks.length /
          (1000 * 60 * 60 * 24) // Convert to days
        : 0;

    // Priority distribution
    const priorityDistribution = allTasks.reduce(
      (acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<TaskPriority, number>
    );

    // Status distribution
    const statusDistribution = allTasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<TaskStatusNew, number>
    );

    // Get unique team members
    const teamMembers = [
      ...new Set([
        ...allTasks.map((task) => task.assignedTo.id),
        ...allTasks.map((task) => task.createdBy.id),
      ]),
    ];

    // Build content for embedding
    const contentParts = [
      `Board: ${board.name}`,
      board.description ? `Description: ${board.description}` : "",
      `Sections: ${board.boardSections.map((s) => s.name).join(", ")}`,
      `Total tasks: ${allTasks.length}`,
      `Completion rate: ${Math.round(completionRate * 100)}%`,
      `Team size: ${teamMembers.length} members`,
      `Priority breakdown: ${Object.entries(priorityDistribution)
        .map(([priority, count]) => `${priority}: ${count}`)
        .join(", ")}`,
      `Status breakdown: ${Object.entries(statusDistribution)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ")}`,
    ];

    const content = contentParts.filter(Boolean).join("\n");

    // Get company ID from first user found or use the provided companyId
    const extractedCompanyId =
      companyId || "";

    return {
      id: board.id,
      content,
      metadata: {
        name: board.name,
        description: board.description || undefined,
        createdBy: board.createdBy,
        teamMembers,
        sectionsCount: board._count.boardSections,
        tasksCount: allTasks.length,
        completionRate,
        avgTaskDuration,
        priorityDistribution,
        statusDistribution,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        companyId: extractedCompanyId,
      },
    };
  }

  /**
   * Batch extract task data for a company
   */
  async extractCompanyTaskData(
    companyId: string,
    limit = 100
  ): Promise<TaskDocument[]> {
    const tasks = await db.task.findMany({
      where: {
        assignedTo: {
          memberships: { some: { companyId: companyId } }, // Filter by company ID
        },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: true,
        createdBy: true,
        boardSection: {
          include: {
            board: true,
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    const taskDocuments: TaskDocument[] = [];

    for (const task of tasks) {
      const doc = await this.extractTaskData(task.id, companyId);
      if (doc) {
        taskDocuments.push(doc);
      }
    }

    return taskDocuments;
  }

  /**
   * Extract board data for a company
   */
  async extractCompanyBoardData(companyId: string): Promise<BoardDocument[]> {
    // Get users from the company to find boards they have access to
    const companyUsers = await db.user.findMany({
      where: { 
        memberships: {
          some: { companyId: companyId }
        }
      },
      select: { id: true },
    });

    const userIds = companyUsers.map((user) => user.id);

    const boards = await db.board.findMany({
      where: {
        // Filter boards where company users have access
        access: {
          hasSome: userIds,
        },
      },
    });

    const boardDocuments: BoardDocument[] = [];

    for (const board of boards) {
      const doc = await this.extractBoardData(board.id, companyId);
      if (doc) {
        boardDocuments.push(doc);
      }
    }

    return boardDocuments;
  }

  /**
   * Check if content has changed since last embedding
   */
  async hasTaskContentChanged(taskId: string): Promise<boolean> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { updatedAt: true },
    });

    if (!task) return false;

    const embedding = await db.taskEmbedding.findUnique({
      where: { taskId },
      select: { updatedAt: true },
    });

    if (!embedding) return true;

    return task.updatedAt > embedding.updatedAt;
  }

  /**
   * Check if board content has changed since last embedding
   */
  async hasBoardContentChanged(boardId: string): Promise<boolean> {
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: { updatedAt: true },
    });

    if (!board) return false;

    const embedding = await db.boardEmbedding.findUnique({
      where: { boardId },
      select: { updatedAt: true },
    });

    if (!embedding) return true;

    return board.updatedAt > embedding.updatedAt;
  }

  /**
   * Get tasks that need embedding updates
   */
  async getTasksNeedingEmbeddingUpdate(companyId: string): Promise<string[]> {
    const tasksWithoutEmbeddings = await db.task.findMany({
      where: {
        assignedTo: { memberships: { some: { companyId: companyId } } },
        embedding: null,
      },
      select: { id: true },
    });

    // Find tasks with outdated embeddings
    const tasksWithEmbeddings = await db.task.findMany({
      where: {
        assignedTo: { memberships: { some: { companyId: companyId } } },
        embedding: { isNot: null },
      },
      include: {
        embedding: true,
      },
    });

    const tasksWithOutdatedEmbeddings = tasksWithEmbeddings.filter(
      (task) => task.embedding && task.updatedAt > task.embedding.updatedAt
    );

    return [
      ...tasksWithoutEmbeddings.map((t) => t.id),
      ...tasksWithOutdatedEmbeddings.map((t) => t.id),
    ];
  }

  /**
   * Get boards that need embedding updates
   */
  async getBoardsNeedingEmbeddingUpdate(companyId: string): Promise<string[]> {
    // Get company users first
    const companyUsers = await db.user.findMany({
      where: { 
        memberships: {
          some: { companyId: companyId }
        }
      },
      select: { id: true },
    });

    const userIds = companyUsers.map((user) => user.id);

    const boardsWithoutEmbeddings = await db.board.findMany({
      where: {
        access: { hasSome: userIds },
        embedding: null,
      },
      select: { id: true },
    });

    // Find boards with outdated embeddings
    const boardsWithEmbeddings = await db.board.findMany({
      where: {
        access: { hasSome: userIds },
        embedding: { isNot: null },
      },
      include: {
        embedding: true,
      },
    });

    const boardsWithOutdatedEmbeddings = boardsWithEmbeddings.filter(
      (board) => board.embedding && board.updatedAt > board.embedding.updatedAt
    );

    return [
      ...boardsWithoutEmbeddings.map((b) => b.id),
      ...boardsWithOutdatedEmbeddings.map((b) => b.id),
    ];
  }
}

export const dataExtractionService = new DataExtractionService();
