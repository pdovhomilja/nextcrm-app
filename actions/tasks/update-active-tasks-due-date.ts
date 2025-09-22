"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import {
  calculateRelativeDateAdjustments,
  validateTaskDate,
  formatDateChange,
  createBulkUpdateSummary,
  type TaskDateInfo,
} from "@/lib/utils/date-calculations";

export type UpdateActiveTasksDueDateInput = {
  boardId: string;
  referenceTaskId: string;
  newDueDate: Date;
};

export type UpdateActiveTasksDueDateResponse = {
  success: boolean;
  message?: string;
  updatedCount?: number;
  error?: string;
};

/**
 * Updates due dates for all active tasks in a board while preserving relative time differences
 * @param input Parameters for the bulk update
 * @returns Response object with success status and details
 */
export async function updateActiveTasksDueDate(
  input: UpdateActiveTasksDueDateInput
): Promise<UpdateActiveTasksDueDateResponse> {
  try {
    // Validate input parameters
    if (!input.boardId || !input.referenceTaskId || !input.newDueDate) {
      return {
        success: false,
        error: "Missing required parameters: boardId, referenceTaskId, or newDueDate",
      };
    }

    // Validate the new due date
    const dateValidation = validateTaskDate(input.newDueDate);
    if (!dateValidation.isValid) {
      return {
        success: false,
        error: `Invalid due date: ${dateValidation.error}`,
      };
    }

    // Get current user session
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    const userId = session.user.id;

    // Execute all operations in a database transaction with extended timeout
    const result = await db.$transaction(async (tx) => {
      // 1. Verify board exists and user has access
      const board = await tx.board.findUnique({
        where: { id: input.boardId },
        select: {
          id: true,
          name: true,
          access: true,
          createdBy: true,
        },
      });

      if (!board) {
        throw new Error("Board not found or access denied");
      }

      // Check if user has access to the board
      if (!board.access.includes(userId) && board.createdBy !== userId) {
        throw new Error("You don't have access to this board");
      }

      // 2. Get the reference task and verify it belongs to this board
      const referenceTask = await tx.task.findFirst({
        where: {
          id: input.referenceTaskId,
          boardSection: {
            boardId: input.boardId,
          },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
        },
      });

      if (!referenceTask) {
        throw new Error("Reference task not found in this board");
      }

      // 3. Get all active tasks in the board (excluding COMPLETED and CANCELLED)
      const activeTasks = await tx.task.findMany({
        where: {
          boardSection: {
            boardId: input.boardId,
          },
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
        },
      });

      if (activeTasks.length === 0) {
        throw new Error("No active tasks found in this board");
      }

      // 4. Calculate new due dates for all active tasks
      const taskDateInfo: TaskDateInfo[] = activeTasks.map(task => ({
        id: task.id,
        dueDate: task.dueDate,
      }));

      const dateAdjustments = calculateRelativeDateAdjustments(
        taskDateInfo,
        input.referenceTaskId,
        input.newDueDate
      );

      // 5. Update all tasks with their new due dates
      const updatePromises = dateAdjustments.map(adjustment =>
        tx.task.update({
          where: { id: adjustment.taskId },
          data: { dueDate: adjustment.newDueDate },
        })
      );

      await Promise.all(updatePromises);

      // 6. Create task history entries for audit trail
      const dateChangeDescription = formatDateChange(referenceTask.dueDate, input.newDueDate);
      const bulkUpdateSummary = createBulkUpdateSummary(dateAdjustments, dateChangeDescription);

      const historyData = dateAdjustments.map(adjustment => {
        const originalTask = activeTasks.find(t => t.id === adjustment.taskId);
        const isReference = adjustment.taskId === input.referenceTaskId;

        let historyDescription: string;
        if (isReference) {
          historyDescription = `Bulk due date update (reference task): ${formatDateChange(originalTask!.dueDate, adjustment.newDueDate)}`;
        } else {
          historyDescription = `Bulk due date update: ${formatDateChange(originalTask!.dueDate, adjustment.newDueDate)} (relative to reference task)`;
        }

        return {
          taskId: adjustment.taskId,
          description: historyDescription,
        };
      });

      await tx.taskHistory.createMany({
        data: historyData,
      });

      return {
        updatedCount: dateAdjustments.length,
        summary: bulkUpdateSummary,
        referenceTaskTitle: referenceTask.title,
        boardName: board.name,
      };
    }, {
      timeout: 15000, // 15 seconds timeout
    });

    return {
      success: true,
      message: `Successfully updated ${result.updatedCount} active task${result.updatedCount !== 1 ? 's' : ''} in "${result.boardName}" with relative date preservation`,
      updatedCount: result.updatedCount,
    };

  } catch (error) {
    console.error("Error in updateActiveTasksDueDate:", error);

    // Return appropriate error messages
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Failed to update tasks due to an unexpected error",
    };
  }
}

/**
 * Helper function to get active tasks count for a board (used by UI for confirmation dialog)
 */
export async function getActiveTasksCount(boardId: string): Promise<{ count: number; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { count: 0, error: "Authentication required" };
    }

    const userId = session.user.id;

    // Verify board access
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: {
        access: true,
        createdBy: true,
      },
    });

    if (!board || (!board.access.includes(userId) && board.createdBy !== userId)) {
      return { count: 0, error: "Board not found or access denied" };
    }

    const count = await db.task.count({
      where: {
        boardSection: {
          boardId,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    return { count };
  } catch (error) {
    console.error("Error getting active tasks count:", error);
    return { count: 0, error: "Failed to get task count" };
  }
}

/**
 * Helper function to get tasks for reference task selection (used by UI)
 */
export async function getBoardTasksForReference(boardId: string): Promise<{
  tasks: Array<{ id: string; title: string; dueDate: Date; status: string }>;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { tasks: [], error: "Authentication required" };
    }

    const userId = session.user.id;

    // Verify board access
    const board = await db.board.findUnique({
      where: { id: boardId },
      select: {
        access: true,
        createdBy: true,
      },
    });

    if (!board || (!board.access.includes(userId) && board.createdBy !== userId)) {
      return { tasks: [], error: "Board not found or access denied" };
    }

    const tasks = await db.task.findMany({
      where: {
        boardSection: {
          boardId,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
      },
      orderBy: [
        { dueDate: "asc" },
        { title: "asc" },
      ],
    });

    return { tasks };
  } catch (error) {
    console.error("Error getting board tasks for reference:", error);
    return { tasks: [], error: "Failed to get tasks" };
  }
}