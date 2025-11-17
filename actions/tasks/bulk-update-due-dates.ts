"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { triggerTaskEmbeddingUpdate } from "@/lib/ai/embedding-triggers";

export type BulkUpdateDueDatesInput = {
  taskIds: string[];
  newDueDate: Date;
  companyId: string;
};

export type BulkUpdateDueDatesResponse = {
  success: boolean;
  message?: string;
  updatedCount?: number;
  error?: string;
};

/**
 * Updates due dates for multiple selected tasks with the same due date
 * @param input Parameters for the bulk update
 * @returns Response object with success status and details
 */
export async function bulkUpdateDueDates(
  input: BulkUpdateDueDatesInput
): Promise<BulkUpdateDueDatesResponse> {
  try {
    // Validate input parameters
    if (!input.taskIds || input.taskIds.length === 0) {
      return {
        success: false,
        error: "taskIds array is required and cannot be empty",
      };
    }

    if (!input.newDueDate) {
      return {
        success: false,
        error: "newDueDate is required",
      };
    }

    if (!input.companyId) {
      return {
        success: false,
        error: "companyId is required",
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

    // Execute all operations in a database transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Get user's accessible boards via companyId
      const accessibleBoards = await tx.board.findMany({
        where: {
          companyId: input.companyId,
          OR: [
            { access: { has: userId } },
            { createdBy: userId },
          ],
        },
        select: {
          id: true,
        },
      });

      const accessibleBoardIds = accessibleBoards.map((board) => board.id);

      if (accessibleBoardIds.length === 0) {
        throw new Error("No accessible boards found for this company");
      }

      // 2. Fetch existing tasks to validate access and get old due dates
      const existingTasks = await tx.task.findMany({
        where: {
          id: { in: input.taskIds },
          boardSection: {
            boardId: { in: accessibleBoardIds },
          },
        },
        select: {
          id: true,
          dueDate: true,
          boardSectionId: true,
        },
      });

      // 3. Filter taskIds to only include tasks user has access to
      const validTaskIds = existingTasks.map((task) => task.id);

      if (validTaskIds.length === 0) {
        throw new Error("No valid tasks found to update");
      }

      // 4. Update all validated tasks with new due date
      await tx.task.updateMany({
        where: {
          id: { in: validTaskIds },
        },
        data: {
          dueDate: input.newDueDate,
        },
      });

      // 5. Create task history entries for tasks that had different due dates
      const historyData = existingTasks
        .filter((task) => task.dueDate.getTime() !== input.newDueDate.getTime())
        .map((task) => {
          const oldDateStr = task.dueDate.toISOString().split("T")[0];
          const newDateStr = input.newDueDate.toISOString().split("T")[0];
          return {
            taskId: task.id,
            description: `Due date updated via bulk action: ${oldDateStr} → ${newDateStr}`,
          };
        });

      if (historyData.length > 0) {
        await tx.taskHistory.createMany({
          data: historyData,
        });
      }

      return {
        updatedCount: validTaskIds.length,
        updatedTaskIds: validTaskIds,
      };
    });

    // 6. Trigger embedding updates for updated tasks (outside transaction)
    // Handle errors gracefully - don't fail bulk update if embedding updates fail
    for (const taskId of result.updatedTaskIds) {
      triggerTaskEmbeddingUpdate(taskId).catch((error) => {
        console.error(`Failed to trigger embedding update for task ${taskId}:`, error);
      });
    }

    return {
      success: true,
      message: `Successfully updated ${result.updatedCount} task(s) with new due date`,
      updatedCount: result.updatedCount,
    };
  } catch (error) {
    console.error("Error in bulkUpdateDueDates:", error);

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
