"use server";

import db from "@/lib/db";
import type { TaskPosition } from "@/app/(app)/[cid]/tasks/_types";

export async function updateTaskPosition(taskId: string, newPosition: number) {
  try {
    await db.task.update({
      where: {
        id: taskId,
      },
      data: {
        position: newPosition,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to update task position: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function updateTaskPositions(updates: TaskPosition[]) {
  if (updates.length === 0) return;

  try {
    await db.$transaction(
      updates.map((update) =>
        db.task.update({
          where: { id: update.id },
          data: { position: update.position },
        }),
      ),
    );
  } catch (error) {
    throw new Error(
      `Failed to update task positions: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function moveTaskToTopOfSection(
  taskId: string,
  sourceSectionId: string,
  targetSectionId: string,
) {
  console.log("🚀 Server: moveTaskToTopOfSection called:", {
    taskId,
    sourceSectionId,
    targetSectionId,
  });

  try {
    await db.$transaction(async (tx) => {
      // Validate source and target sections exist
      const sourceSection = await tx.boardSection.findUnique({
        where: { id: sourceSectionId },
      });

      const targetSection = await tx.boardSection.findUnique({
        where: { id: targetSectionId },
      });

      if (!sourceSection) {
        throw new Error(`Source section not found: ${sourceSectionId}`);
      }

      if (!targetSection) {
        throw new Error(`Target section not found: ${targetSectionId}`);
      }

      // Get current task to move
      const taskToMove = await tx.task.findUnique({
        where: { id: taskId },
      });

      if (!taskToMove) {
        throw new Error("Task not found");
      }

      // Get all tasks in the target section ordered by position
      const targetSectionTasks = await tx.task.findMany({
        where: {
          boardSectionId: targetSectionId,
        },
        orderBy: { position: "asc" },
      });

      // Shift all existing tasks in target section down by 1 position
      await Promise.all(
        targetSectionTasks.map((task) =>
          tx.task.update({
            where: { id: task.id },
            data: { position: task.position + 1 },
          }),
        ),
      );

      // Move task to target section at position 0 (top)
      console.log("🔄 Server: Moving task to top of target section");
      const result = await tx.task.update({
        where: { id: taskId },
        data: {
          boardSectionId: targetSectionId,
          position: 0,
        },
      });

      console.log("✅ Server: Task moved successfully");

      // Clean up positions in source section (only if different from target)
      if (sourceSectionId !== targetSectionId) {
        console.log("🧹 Server: Cleaning up source section positions");
        const sourceSectionTasks = await tx.task.findMany({
          where: {
            boardSectionId: sourceSectionId,
          },
          orderBy: { position: "asc" },
        });

        // Reindex source section tasks to remove gaps
        await Promise.all(
          sourceSectionTasks.map((task, index) =>
            tx.task.update({
              where: { id: task.id },
              data: { position: index },
            }),
          ),
        );
      }

      console.log("🎉 Server: Transaction completed successfully");
      return result;
    });

    console.log("🎊 Server: moveTaskToTopOfSection completed successfully");
  } catch (error) {
    console.error("❌ Server: Failed to move task to top of section:", error);
    throw new Error(
      `Failed to move task to top of section: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Keep the old function for backward compatibility
export const moveTaskBetweenSections = moveTaskToTopOfSection;

// New precise move with explicit target index within the target section
export async function moveTaskBetweenSectionsAtPosition(
  taskId: string,
  sourceSectionId: string,
  targetSectionId: string,
  targetPosition: number,
) {
  try {
    await db.$transaction(async (tx) => {
      const [sourceSection, targetSection] = await Promise.all([
        tx.boardSection.findUnique({ where: { id: sourceSectionId } }),
        tx.boardSection.findUnique({ where: { id: targetSectionId } }),
      ]);

      if (!sourceSection)
        throw new Error(`Source section not found: ${sourceSectionId}`);
      if (!targetSection)
        throw new Error(`Target section not found: ${targetSectionId}`);

      const taskToMove = await tx.task.findUnique({ where: { id: taskId } });
      if (!taskToMove) throw new Error("Task not found");

      const targetTasks = await tx.task.findMany({
        where: { boardSectionId: targetSectionId },
        orderBy: { position: "asc" },
      });

      // Clamp target index to valid range
      const clampedIndex = Math.max(
        0,
        Math.min(targetTasks.length, targetPosition),
      );

      // Shift target tasks at and after the insertion point
      await Promise.all(
        targetTasks
          .filter((t) => t.position >= clampedIndex)
          .map((t) =>
            tx.task.update({
              where: { id: t.id },
              data: { position: t.position + 1 },
            }),
          ),
      );

      // Move the task
      await tx.task.update({
        where: { id: taskId },
        data: { boardSectionId: targetSectionId, position: clampedIndex },
      });

      // Reindex source section tasks to remove gaps
      if (sourceSectionId !== targetSectionId) {
        const sourceTasks = await tx.task.findMany({
          where: { boardSectionId: sourceSectionId },
          orderBy: { position: "asc" },
        });

        await Promise.all(
          sourceTasks.map((t, index) =>
            tx.task.update({ where: { id: t.id }, data: { position: index } }),
          ),
        );
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to move task between sections: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
