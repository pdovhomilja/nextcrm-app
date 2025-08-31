import { embeddingStorageService } from "./embedding-storage";
import { aiConfig } from "./config";

export class EmbeddingTriggerService {
  private updateQueue: Set<string> = new Set();
  private processing = false;

  /**
   * Queue task for embedding update
   */
  async queueTaskEmbeddingUpdate(taskId: string): Promise<void> {
    this.updateQueue.add(taskId);

    // Process queue if not already processing
    if (!this.processing) {
      // Use setImmediate to avoid blocking the main thread
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Queue board for embedding update
   */
  async queueBoardEmbeddingUpdate(boardId: string): Promise<void> {
    this.updateQueue.add(`board:${boardId}`);

    // Process queue if not already processing
    if (!this.processing) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Process the embedding update queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      while (this.updateQueue.size > 0) {
        const items = Array.from(this.updateQueue).slice(
          0,
          aiConfig.embedding.batchSize,
        );

        // Clear processed items from queue
        items.forEach((id) => this.updateQueue.delete(id));

        // Separate tasks and boards
        const taskIds = items
          .filter((id) => !id.startsWith("board:"))
          .slice(0, 5);
        const boardIds = items
          .filter((id) => id.startsWith("board:"))
          .map((id) => id.replace("board:", ""))
          .slice(0, 2);

        // Process in parallel with limited concurrency
        const promises: Promise<boolean>[] = [];

        // Add task processing promises
        taskIds.forEach((taskId) => {
          promises.push(embeddingStorageService.processTaskEmbedding(taskId));
        });

        // Add board processing promises
        boardIds.forEach((boardId) => {
          promises.push(embeddingStorageService.processBoardEmbedding(boardId));
        });

        if (promises.length > 0) {
          await Promise.allSettled(promises);
        }

        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Error processing embedding queue:", error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Immediate embedding update (for critical operations)
   */
  async immediateTaskEmbeddingUpdate(taskId: string): Promise<boolean> {
    try {
      return await embeddingStorageService.processTaskEmbedding(taskId);
    } catch (error) {
      console.error(
        `Immediate embedding update failed for task ${taskId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Immediate board embedding update
   */
  async immediateBoardEmbeddingUpdate(boardId: string): Promise<boolean> {
    try {
      return await embeddingStorageService.processBoardEmbedding(boardId);
    } catch (error) {
      console.error(
        `Immediate embedding update failed for board ${boardId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Handle task deletion
   */
  async handleTaskDeletion(taskId: string): Promise<void> {
    try {
      await embeddingStorageService.deleteTaskEmbedding(taskId);
    } catch (error) {
      console.error(`Failed to delete embedding for task ${taskId}:`, error);
    }
  }

  /**
   * Handle board deletion
   */
  async handleBoardDeletion(boardId: string): Promise<void> {
    try {
      await embeddingStorageService.deleteBoardEmbedding(boardId);
    } catch (error) {
      console.error(`Failed to delete embedding for board ${boardId}:`, error);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueSize: number;
    processing: boolean;
    taskCount: number;
    boardCount: number;
  } {
    const items = Array.from(this.updateQueue);
    const taskCount = items.filter((id) => !id.startsWith("board:")).length;
    const boardCount = items.filter((id) => id.startsWith("board:")).length;

    return {
      queueSize: this.updateQueue.size,
      processing: this.processing,
      taskCount,
      boardCount,
    };
  }

  /**
   * Clear the update queue
   */
  clearQueue(): void {
    this.updateQueue.clear();
  }
}

export const embeddingTriggerService = new EmbeddingTriggerService();

// Utility functions for integration with existing server actions
export async function triggerTaskEmbeddingUpdate(
  taskId: string,
  immediate = false,
): Promise<void> {
  if (!aiConfig.features.enabled) {
    console.log("AI features disabled, skipping embedding update");
    return;
  }

  try {
    if (immediate) {
      await embeddingTriggerService.immediateTaskEmbeddingUpdate(taskId);
    } else {
      await embeddingTriggerService.queueTaskEmbeddingUpdate(taskId);
    }
  } catch (error) {
    console.error(
      `Failed to trigger task embedding update for ${taskId}:`,
      error,
    );
  }
}

export async function triggerBoardEmbeddingUpdate(
  boardId: string,
  immediate = false,
): Promise<void> {
  if (!aiConfig.features.enabled) {
    console.log("AI features disabled, skipping embedding update");
    return;
  }

  try {
    if (immediate) {
      await embeddingTriggerService.immediateBoardEmbeddingUpdate(boardId);
    } else {
      await embeddingTriggerService.queueBoardEmbeddingUpdate(boardId);
    }
  } catch (error) {
    console.error(
      `Failed to trigger board embedding update for ${boardId}:`,
      error,
    );
  }
}

export async function triggerTaskEmbeddingDeletion(
  taskId: string,
): Promise<void> {
  if (!aiConfig.features.enabled) {
    return;
  }

  try {
    await embeddingTriggerService.handleTaskDeletion(taskId);
  } catch (error) {
    console.error(
      `Failed to trigger task embedding deletion for ${taskId}:`,
      error,
    );
  }
}

export async function triggerBoardEmbeddingDeletion(
  boardId: string,
): Promise<void> {
  if (!aiConfig.features.enabled) {
    return;
  }

  try {
    await embeddingTriggerService.handleBoardDeletion(boardId);
  } catch (error) {
    console.error(
      `Failed to trigger board embedding deletion for ${boardId}:`,
      error,
    );
  }
}
