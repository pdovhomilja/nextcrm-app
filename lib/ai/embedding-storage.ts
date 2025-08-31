import db from "@/lib/db";
import { embeddingService } from "./embedding-service";
import { dataExtractionService } from "./data-extraction";
import { randomUUID } from "crypto";
import { Prisma } from "@/lib/generated/prisma";

export class EmbeddingStorageService {
  /**
   * Store task embedding in database
   */
  async storeTaskEmbedding(
    taskId: string,
    embedding: number[],
    content: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      // Use raw SQL for vector operations until Prisma vector support is stable
      const embeddingArray = `[${embedding.join(",")}]`;

      await db.$executeRaw`
        INSERT INTO task_embeddings (id, task_id, embedding, content, metadata, created_at, updated_at)
        VALUES (${randomUUID()}, ${taskId}, ${embeddingArray}::vector, ${content}, ${JSON.stringify(metadata)}::jsonb, NOW(), NOW())
        ON CONFLICT (task_id) 
        DO UPDATE SET 
          embedding = ${embeddingArray}::vector,
          content = ${content},
          metadata = ${JSON.stringify(metadata)}::jsonb,
          updated_at = NOW()
      `;

      console.log(
        `Successfully stored embedding for task ${taskId}, content: ${content.substring(0, 50)}...`,
      );
      console.log(
        `Embedding dimensions: ${embedding.length}, metadata:`,
        metadata,
      );
    } catch (error) {
      console.error(`Failed to store task embedding for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Store board embedding in database
   */
  async storeBoardEmbedding(
    boardId: string,
    embedding: number[],
    content: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      // Use raw SQL for vector operations until Prisma vector support is stable
      const embeddingArray = `[${embedding.join(",")}]`;

      await db.$executeRaw`
        INSERT INTO board_embeddings (id, board_id, embedding, content, metadata, created_at, updated_at)
        VALUES (${randomUUID()}, ${boardId}, ${embeddingArray}::vector, ${content}, ${JSON.stringify(metadata)}::jsonb, NOW(), NOW())
        ON CONFLICT (board_id) 
        DO UPDATE SET 
          embedding = ${embeddingArray}::vector,
          content = ${content},
          metadata = ${JSON.stringify(metadata)}::jsonb,
          updated_at = NOW()
      `;

      console.log(
        `Successfully stored embedding for board ${boardId}, content: ${content.substring(0, 50)}...`,
      );
      console.log(
        `Embedding dimensions: ${embedding.length}, metadata:`,
        metadata,
      );
    } catch (error) {
      console.error(`Failed to store board embedding for ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Generate and store embedding for a single task
   */
  async processTaskEmbedding(
    taskId: string,
    companyId?: string,
  ): Promise<boolean> {
    try {
      const taskDoc = await dataExtractionService.extractTaskData(
        taskId,
        companyId,
      );
      if (!taskDoc) {
        console.error(`Task ${taskId} not found or access denied`);
        return false;
      }

      const embedding = await embeddingService.generateEmbedding(
        taskDoc.content,
      );

      await this.storeTaskEmbedding(
        taskId,
        embedding,
        taskDoc.content,
        taskDoc.metadata,
      );

      console.log(`Successfully processed task embedding: ${taskId}`);
      return true;
    } catch (error) {
      console.error(`Failed to process task embedding for ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Generate and store embedding for a single board
   */
  async processBoardEmbedding(
    boardId: string,
    companyId?: string,
  ): Promise<boolean> {
    try {
      const boardDoc = await dataExtractionService.extractBoardData(
        boardId,
        companyId,
      );
      if (!boardDoc) {
        console.error(`Board ${boardId} not found or access denied`);
        return false;
      }

      const embedding = await embeddingService.generateEmbedding(
        boardDoc.content,
      );

      await this.storeBoardEmbedding(
        boardId,
        embedding,
        boardDoc.content,
        boardDoc.metadata,
      );

      console.log(`Successfully processed board embedding: ${boardId}`);
      return true;
    } catch (error) {
      console.error(`Failed to process board embedding for ${boardId}:`, error);
      return false;
    }
  }

  /**
   * Batch process task embeddings
   */
  async batchProcessTaskEmbeddings(
    taskIds: string[],
    companyId: string,
    batchSize = 10,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < taskIds.length; i += batchSize) {
      const batch = taskIds.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(taskIds.length / batchSize)}`,
      );

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((taskId) => this.processTaskEmbedding(taskId, companyId)),
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          success++;
        } else {
          failed++;
          const taskId = batch[index];
          const error =
            result.status === "rejected" ? result.reason : "Unknown error";
          errors.push(`Task ${taskId}: ${error}`);
          console.error(`Failed to process task ${taskId}:`, error);
        }
      });

      // Small delay between batches to avoid rate limits
      if (i + batchSize < taskIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { success, failed, errors };
  }

  /**
   * Batch process board embeddings
   */
  async batchProcessBoardEmbeddings(
    boardIds: string[],
    companyId: string,
    batchSize = 5,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < boardIds.length; i += batchSize) {
      const batch = boardIds.slice(i, i + batchSize);

      console.log(
        `Processing board batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(boardIds.length / batchSize)}`,
      );

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((boardId) => this.processBoardEmbedding(boardId, companyId)),
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          success++;
        } else {
          failed++;
          const boardId = batch[index];
          const error =
            result.status === "rejected" ? result.reason : "Unknown error";
          errors.push(`Board ${boardId}: ${error}`);
          console.error(`Failed to process board ${boardId}:`, error);
        }
      });

      // Small delay between batches to avoid rate limits
      if (i + batchSize < boardIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return { success, failed, errors };
  }

  /**
   * Process all embeddings for a company
   */
  async processCompanyEmbeddings(companyId: string): Promise<{
    tasks: { success: number; failed: number; errors: string[] };
    boards: { success: number; failed: number; errors: string[] };
    summary: {
      totalProcessed: number;
      totalErrors: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    console.log(`Starting embedding processing for company ${companyId}`);

    // Get tasks needing embedding updates
    const taskIds =
      await dataExtractionService.getTasksNeedingEmbeddingUpdate(companyId);
    console.log(`Found ${taskIds.length} tasks needing embedding updates`);

    // Get boards needing embedding updates
    const boardIds =
      await dataExtractionService.getBoardsNeedingEmbeddingUpdate(companyId);
    console.log(`Found ${boardIds.length} boards needing embedding updates`);

    // Process tasks and boards in parallel
    const [taskResults, boardResults] = await Promise.all([
      this.batchProcessTaskEmbeddings(taskIds, companyId),
      this.batchProcessBoardEmbeddings(boardIds, companyId),
    ]);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const summary = {
      totalProcessed: taskResults.success + boardResults.success,
      totalErrors: taskResults.failed + boardResults.failed,
      processingTime,
    };

    console.log(`Embedding processing complete for company ${companyId}:`, {
      tasks: taskResults,
      boards: boardResults,
      summary,
    });

    return {
      tasks: taskResults,
      boards: boardResults,
      summary,
    };
  }

  /**
   * Delete task embedding
   */
  async deleteTaskEmbedding(taskId: string): Promise<void> {
    try {
      await db.taskEmbedding.delete({
        where: { taskId },
      });
      console.log(`Deleted task embedding: ${taskId}`);
    } catch (error) {
      // Ignore if embedding doesn't exist
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return;
      }
      throw error;
    }
  }

  /**
   * Delete board embedding
   */
  async deleteBoardEmbedding(boardId: string): Promise<void> {
    try {
      await db.boardEmbedding.delete({
        where: { boardId },
      });
      console.log(`Deleted board embedding: ${boardId}`);
    } catch (error) {
      // Ignore if embedding doesn't exist
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return;
      }
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalTaskEmbeddings: number;
    totalBoardEmbeddings: number;
    oldestTaskEmbedding?: Date;
    newestTaskEmbedding?: Date;
    avgEmbeddingAge: number;
    companyBreakdown: Record<string, { tasks: number; boards: number }>;
  }> {
    const [taskStats, boardCount] = await Promise.all([
      db.taskEmbedding.aggregate({
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      db.boardEmbedding.count(),
    ]);

    // Build company breakdown (simplified - would need better company extraction from metadata)
    const companyBreakdown: Record<string, { tasks: number; boards: number }> =
      {};

    const now = new Date();
    // Calculate average age using min/max (simplified)
    const oldestDate = taskStats._min.createdAt;
    const newestDate = taskStats._max.createdAt;
    const avgEmbeddingAge =
      oldestDate && newestDate
        ? (now.getTime() - (oldestDate.getTime() + newestDate.getTime()) / 2) /
          (1000 * 60 * 60 * 24) // Days
        : 0;

    return {
      totalTaskEmbeddings: taskStats._count.id,
      totalBoardEmbeddings: boardCount,
      oldestTaskEmbedding: taskStats._min.createdAt || undefined,
      newestTaskEmbedding: taskStats._max.createdAt || undefined,
      avgEmbeddingAge,
      companyBreakdown,
    };
  }

  /**
   * Get embeddings health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const stats = await this.getEmbeddingStats();

      // Check if we have any embeddings
      if (stats.totalTaskEmbeddings === 0 && stats.totalBoardEmbeddings === 0) {
        issues.push("No embeddings found in database");
        recommendations.push(
          "Run initial embedding generation for your company data",
        );
      }

      // Check for old embeddings
      if (stats.avgEmbeddingAge > 7) {
        issues.push(
          `Average embedding age is ${stats.avgEmbeddingAge.toFixed(1)} days`,
        );
        recommendations.push(
          "Consider running embedding updates for recent changes",
        );
      }

      // Test embedding generation
      const healthCheck = await embeddingService.healthCheck();
      if (!healthCheck.healthy) {
        issues.push(`Embedding service unhealthy: ${healthCheck.error}`);
        recommendations.push("Check OpenAI API key and network connectivity");
      }
    } catch (error) {
      issues.push(
        `Database connectivity issue: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      recommendations.push(
        "Check database connection and pgvector installation",
      );
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

export const embeddingStorageService = new EmbeddingStorageService();
