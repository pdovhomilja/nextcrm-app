# Phase 2: Embedding Generation

## Overview
This phase implements the embedding generation system using Vercel AI SDK, creates the data extraction pipeline, and establishes real-time synchronization between task data and vector embeddings.

## Prerequisites
- Completed Phase 1: MCP Server Setup & Vector Database Integration
- pgvector-enabled PostgreSQL database
- OpenAI API access configured
- Vercel AI SDK installed

## Implementation Batches

### Batch 2.1: AI Configuration & Base Services

**Estimated Time**: 2-3 hours
**API Token Usage**: Low

#### Tasks:
- [ ] Create AI configuration module
- [ ] Set up Vercel AI SDK embedding service
- [ ] Implement cost optimization utilities
- [ ] Create embedding queue system

#### AI Configuration Setup:
Create `/lib/ai/config.ts`:

```typescript
import { openai } from "@ai-sdk/openai";

export const aiConfig = {
  // Embedding model configuration
  embeddingModel: openai.embedding(
    process.env.EMBEDDING_MODEL || "text-embedding-ada-002"
  ),

  // Chat model for analysis
  chatModel: openai(process.env.AI_MODEL || "gpt-4-turbo"),

  // Embedding settings
  embedding: {
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
    batchSize: 100, // Process 100 items at once
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Cost optimization
  optimization: {
    enableCaching: true,
    cacheExpiryHours: 24,
    enableDeduplication: true,
    maxContentLength: 8192, // OpenAI limit
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000,
  },
};

export const EMBEDDING_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
```

#### Base Embedding Service:
Create `/lib/ai/embedding-service.ts`:

```typescript
import { embed, embedMany } from "ai";
import { aiConfig } from "./config";
import db from "@/lib/db";
import { createHash } from "crypto";

export class EmbeddingService {
  private static instance: EmbeddingService;
  private cache: Map<string, { embedding: number[]; timestamp: number }> = new Map();

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate content hash for caching and deduplication
   */
  private generateContentHash(content: string): string {
    return createHash("sha256").update(content.trim().toLowerCase()).digest("hex");
  }

  /**
   * Get embedding from cache if available and not expired
   */
  private getCachedEmbedding(contentHash: string): number[] | null {
    if (!aiConfig.optimization.enableCaching) return null;

    const cached = this.cache.get(contentHash);
    if (cached) {
      const isExpired = 
        Date.now() - cached.timestamp > aiConfig.optimization.cacheExpiryHours * 60 * 60 * 1000;
      
      if (!isExpired) {
        return cached.embedding;
      } else {
        this.cache.delete(contentHash);
      }
    }
    return null;
  }

  /**
   * Cache embedding for future use
   */
  private cacheEmbedding(contentHash: string, embedding: number[]): void {
    if (!aiConfig.optimization.enableCaching) return;

    this.cache.set(contentHash, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate single embedding with caching and optimization
   */
  async generateEmbedding(content: string): Promise<number[]> {
    if (!content?.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Truncate content if too long
    const truncatedContent = content.length > aiConfig.optimization.maxContentLength
      ? content.substring(0, aiConfig.optimization.maxContentLength)
      : content;

    const contentHash = this.generateContentHash(truncatedContent);

    // Check cache first
    const cachedEmbedding = this.getCachedEmbedding(contentHash);
    if (cachedEmbedding) {
      return cachedEmbedding;
    }

    // Generate new embedding
    const { embedding } = await embed({
      model: aiConfig.embeddingModel,
      value: truncatedContent,
    });

    // Cache the result
    this.cacheEmbedding(contentHash, embedding);

    return embedding;
  }

  /**
   * Generate multiple embeddings efficiently
   */
  async generateEmbeddings(contents: string[]): Promise<number[][]> {
    if (!contents.length) return [];

    const processedContents: string[] = [];
    const contentHashes: string[] = [];
    const cachedResults: (number[] | null)[] = [];

    // Process and check cache for each content
    for (const content of contents) {
      if (!content?.trim()) {
        cachedResults.push(null);
        continue;
      }

      const truncated = content.length > aiConfig.optimization.maxContentLength
        ? content.substring(0, aiConfig.optimization.maxContentLength)
        : content;

      const hash = this.generateContentHash(truncated);
      const cached = this.getCachedEmbedding(hash);

      contentHashes.push(hash);
      processedContents.push(truncated);
      cachedResults.push(cached);
    }

    // Find items that need new embeddings
    const needEmbedding: { index: number; content: string; hash: string }[] = [];
    cachedResults.forEach((cached, index) => {
      if (cached === null) {
        needEmbedding.push({
          index,
          content: processedContents[index],
          hash: contentHashes[index],
        });
      }
    });

    // Generate embeddings for non-cached items
    let newEmbeddings: number[][] = [];
    if (needEmbedding.length > 0) {
      const { embeddings } = await embedMany({
        model: aiConfig.embeddingModel,
        values: needEmbedding.map(item => item.content),
      });
      newEmbeddings = embeddings;

      // Cache new embeddings
      needEmbedding.forEach((item, embeddingIndex) => {
        this.cacheEmbedding(item.hash, newEmbeddings[embeddingIndex]);
      });
    }

    // Combine cached and new embeddings
    const results: number[][] = [];
    let newEmbeddingIndex = 0;

    cachedResults.forEach((cached, index) => {
      if (cached !== null) {
        results.push(cached);
      } else {
        results.push(newEmbeddings[newEmbeddingIndex]);
        newEmbeddingIndex++;
      }
    });

    return results;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Will be implemented with proper metrics
    };
  }
}

export const embeddingService = EmbeddingService.getInstance();
```

### Batch 2.2: Data Extraction Pipeline

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create task data extraction utilities
- [ ] Implement board context extraction
- [ ] Add metadata compilation functions
- [ ] Create data transformation pipeline

#### Task Data Extraction:
Create `/lib/ai/data-extraction.ts`:

```typescript
import db from "@/lib/db";
import { TaskPriority, TaskStatusNew, UserRole } from "@prisma/client";

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
  async extractTaskData(taskId: string): Promise<TaskDocument | null> {
    const task = await db.task.findUnique({
      where: { id: taskId },
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
    ];

    // Add recent history context
    if (task.history.length > 0) {
      const historyContext = task.history
        .map(h => `${h.action}: ${h.details}`)
        .join("; ");
      contentParts.push(`Recent activity: ${historyContext}`);
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
        assigneeNames: [task.assignedTo.name],
        creatorId: task.createdBy.id,
        creatorName: task.createdBy.name,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate,
        companyId: task.assignedTo.cid || "", // Assuming cid is company ID
        tags: [], // Will be enhanced later
      },
    };
  }

  /**
   * Extract and format board data for embedding
   */
  async extractBoardData(boardId: string): Promise<BoardDocument | null> {
    const board = await db.board.findUnique({
      where: { id: boardId },
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

    const allTasks = board.boardSections.flatMap(section => section.tasks);
    const completedTasks = allTasks.filter(task => task.status === "COMPLETED");
    
    // Calculate metrics
    const completionRate = allTasks.length > 0 ? completedTasks.length / allTasks.length : 0;
    
    const avgTaskDuration = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          const duration = task.updatedAt.getTime() - task.createdAt.getTime();
          return sum + duration;
        }, 0) / completedTasks.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Priority distribution
    const priorityDistribution = allTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);

    // Status distribution
    const statusDistribution = allTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatusNew, number>);

    // Get unique team members
    const teamMembers = [
      ...new Set([
        ...allTasks.map(task => task.assignedTo.id),
        ...allTasks.map(task => task.createdBy.id),
      ]),
    ];

    // Build content for embedding
    const contentParts = [
      `Board: ${board.name}`,
      board.description ? `Description: ${board.description}` : "",
      `Sections: ${board.boardSections.map(s => s.name).join(", ")}`,
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
        companyId: "", // Will need to be derived from user context
      },
    };
  }

  /**
   * Batch extract task data for a company
   */
  async extractCompanyTaskData(companyId: string, limit = 100): Promise<TaskDocument[]> {
    const tasks = await db.task.findMany({
      where: {
        assignedTo: {
          cid: companyId, // Filter by company ID
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
      const doc = await this.extractTaskData(task.id);
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
    const boards = await db.board.findMany({
      where: {
        // Filter boards where user has access - will need to be enhanced based on access control
        access: {
          hasSome: [], // Placeholder - needs proper company filtering
        },
      },
    });

    const boardDocuments: BoardDocument[] = [];

    for (const board of boards) {
      const doc = await this.extractBoardData(board.id);
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
   * Get tasks that need embedding updates
   */
  async getTasksNeedingEmbeddingUpdate(companyId: string): Promise<string[]> {
    const tasksWithoutEmbeddings = await db.task.findMany({
      where: {
        assignedTo: { cid: companyId },
        taskEmbedding: null,
      },
      select: { id: true },
    });

    const tasksWithOutdatedEmbeddings = await db.task.findMany({
      where: {
        assignedTo: { cid: companyId },
        taskEmbedding: {
          updatedAt: {
            lt: db.task.fields.updatedAt,
          },
        },
      },
      select: { id: true },
    });

    return [
      ...tasksWithoutEmbeddings.map(t => t.id),
      ...tasksWithOutdatedEmbeddings.map(t => t.id),
    ];
  }
}

export const dataExtractionService = new DataExtractionService();
```

### Batch 2.3: Embedding Storage & Management

**Estimated Time**: 2-3 hours
**API Token Usage**: Low-Medium

#### Tasks:
- [ ] Create embedding storage service
- [ ] Implement batch processing utilities
- [ ] Add embedding update triggers
- [ ] Create embedding validation functions

#### Embedding Storage Service:
Create `/lib/ai/embedding-storage.ts`:

```typescript
import db from "@/lib/db";
import { embeddingService } from "./embedding-service";
import { dataExtractionService, TaskDocument, BoardDocument } from "./data-extraction";
import { Prisma } from "@prisma/client";

export class EmbeddingStorageService {
  /**
   * Store task embedding in database
   */
  async storeTaskEmbedding(
    taskId: string,
    embedding: number[],
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      await db.taskEmbedding.upsert({
        where: { taskId },
        update: {
          embedding: `[${embedding.join(",")}]` as any,
          content,
          metadata,
          updatedAt: new Date(),
        },
        create: {
          taskId,
          embedding: `[${embedding.join(",")}]` as any,
          content,
          metadata,
        },
      });
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
    metadata: any
  ): Promise<void> {
    try {
      await db.boardEmbedding.upsert({
        where: { boardId },
        update: {
          embedding: `[${embedding.join(",")}]` as any,
          content,
          metadata,
          updatedAt: new Date(),
        },
        create: {
          boardId,
          embedding: `[${embedding.join(",")}]` as any,
          content,
          metadata,
        },
      });
    } catch (error) {
      console.error(`Failed to store board embedding for ${boardId}:`, error);
      throw error;
    }
  }

  /**
   * Generate and store embedding for a single task
   */
  async processTaskEmbedding(taskId: string): Promise<boolean> {
    try {
      const taskDoc = await dataExtractionService.extractTaskData(taskId);
      if (!taskDoc) {
        console.error(`Task ${taskId} not found`);
        return false;
      }

      const embedding = await embeddingService.generateEmbedding(taskDoc.content);
      
      await this.storeTaskEmbedding(
        taskId,
        embedding,
        taskDoc.content,
        taskDoc.metadata
      );

      return true;
    } catch (error) {
      console.error(`Failed to process task embedding for ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Generate and store embedding for a single board
   */
  async processBoardEmbedding(boardId: string): Promise<boolean> {
    try {
      const boardDoc = await dataExtractionService.extractBoardData(boardId);
      if (!boardDoc) {
        console.error(`Board ${boardId} not found`);
        return false;
      }

      const embedding = await embeddingService.generateEmbedding(boardDoc.content);
      
      await this.storeBoardEmbedding(
        boardId,
        embedding,
        boardDoc.content,
        boardDoc.metadata
      );

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
    batchSize = 10
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (let i = 0; i < taskIds.length; i += batchSize) {
      const batch = taskIds.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(taskIds.length / batchSize)}`);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(taskId => this.processTaskEmbedding(taskId))
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          success++;
        } else {
          failed++;
          console.error(`Failed to process task ${batch[index]}`);
        }
      });

      // Small delay between batches to avoid rate limits
      if (i + batchSize < taskIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success, failed };
  }

  /**
   * Process all embeddings for a company
   */
  async processCompanyEmbeddings(companyId: string): Promise<{
    tasks: { success: number; failed: number };
    boards: { success: number; failed: number };
  }> {
    console.log(`Starting embedding processing for company ${companyId}`);

    // Get tasks needing embedding updates
    const taskIds = await dataExtractionService.getTasksNeedingEmbeddingUpdate(companyId);
    console.log(`Found ${taskIds.length} tasks needing embedding updates`);

    const taskResults = await this.batchProcessTaskEmbeddings(taskIds);

    // Get boards for the company (simplified - may need better filtering)
    const boards = await db.board.findMany({
      select: { id: true },
      take: 50, // Limit for initial processing
    });

    let boardSuccess = 0;
    let boardFailed = 0;

    for (const board of boards) {
      const result = await this.processBoardEmbedding(board.id);
      if (result) {
        boardSuccess++;
      } else {
        boardFailed++;
      }
    }

    const boardResults = { success: boardSuccess, failed: boardFailed };

    console.log(`Embedding processing complete:`, {
      tasks: taskResults,
      boards: boardResults,
    });

    return {
      tasks: taskResults,
      boards: boardResults,
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
    } catch (error) {
      // Ignore if embedding doesn't exist
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
    } catch (error) {
      // Ignore if embedding doesn't exist
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
  }> {
    const [taskStats, boardCount] = await Promise.all([
      db.taskEmbedding.aggregate({
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
        _avg: { createdAt: true },
      }),
      db.boardEmbedding.count(),
    ]);

    const now = new Date();
    const avgCreatedAt = taskStats._avg.createdAt;
    const avgEmbeddingAge = avgCreatedAt 
      ? (now.getTime() - avgCreatedAt.getTime()) / (1000 * 60 * 60 * 24) // Days
      : 0;

    return {
      totalTaskEmbeddings: taskStats._count.id,
      totalBoardEmbeddings: boardCount,
      oldestTaskEmbedding: taskStats._min.createdAt || undefined,
      newestTaskEmbedding: taskStats._max.createdAt || undefined,
      avgEmbeddingAge,
    };
  }
}

export const embeddingStorageService = new EmbeddingStorageService();
```

### Batch 2.4: Real-time Embedding Updates

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create embedding update triggers
- [ ] Implement async embedding queue
- [ ] Add error handling and retry logic
- [ ] Integrate with existing server actions

#### Update Existing Server Actions:
Create `/lib/ai/embedding-triggers.ts`:

```typescript
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
      this.processQueue();
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
        const taskIds = Array.from(this.updateQueue).slice(0, aiConfig.embedding.batchSize);
        
        // Clear processed items from queue
        taskIds.forEach(id => this.updateQueue.delete(id));

        // Process in parallel with limited concurrency
        await Promise.allSettled(
          taskIds.map(taskId => 
            embeddingStorageService.processTaskEmbedding(taskId)
          )
        );

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      console.error(`Immediate embedding update failed for task ${taskId}:`, error);
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
}

export const embeddingTriggerService = new EmbeddingTriggerService();

// Utility functions for integration with existing server actions
export async function triggerTaskEmbeddingUpdate(taskId: string, immediate = false): Promise<void> {
  if (immediate) {
    await embeddingTriggerService.immediateTaskEmbeddingUpdate(taskId);
  } else {
    await embeddingTriggerService.queueTaskEmbeddingUpdate(taskId);
  }
}

export async function triggerTaskEmbeddingDeletion(taskId: string): Promise<void> {
  await embeddingTriggerService.handleTaskDeletion(taskId);
}
```

#### Update `/actions/tasks/create-task.ts`:

```typescript
// Add to existing create-task.ts
import { triggerTaskEmbeddingUpdate } from "@/lib/ai/embedding-triggers";

// After successful task creation, add:
if (task.id) {
  // Queue embedding generation (non-blocking)
  triggerTaskEmbeddingUpdate(task.id).catch(error => {
    console.error("Failed to queue embedding update:", error);
  });
}
```

### Batch 2.5: Embedding Management API

**Estimated Time**: 2-3 hours
**API Token Usage**: Low-Medium

#### Tasks:
- [ ] Create embedding management endpoints
- [ ] Add batch processing endpoints
- [ ] Implement embedding health checks
- [ ] Create admin utilities

#### Create `/app/api/ai/embeddings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { embeddingStorageService } from "@/lib/ai/embedding-storage";
import { dataExtractionService } from "@/lib/ai/data-extraction";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, companyId, taskIds, boardIds } = await request.json();

    switch (action) {
      case "process_company":
        if (!companyId) {
          return NextResponse.json({ error: "Company ID required" }, { status: 400 });
        }
        
        const results = await embeddingStorageService.processCompanyEmbeddings(companyId);
        return NextResponse.json({
          success: true,
          results,
          message: "Company embeddings processed successfully",
        });

      case "process_tasks":
        if (!taskIds || !Array.isArray(taskIds)) {
          return NextResponse.json({ error: "Task IDs array required" }, { status: 400 });
        }

        const taskResults = await embeddingStorageService.batchProcessTaskEmbeddings(taskIds);
        return NextResponse.json({
          success: true,
          results: taskResults,
          message: `Processed ${taskResults.success} tasks successfully`,
        });

      case "process_single_task":
        const { taskId } = await request.json();
        if (!taskId) {
          return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        const success = await embeddingStorageService.processTaskEmbedding(taskId);
        return NextResponse.json({
          success,
          message: success ? "Task embedding processed" : "Failed to process task embedding",
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Embedding API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await embeddingStorageService.getEmbeddingStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Embedding stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Testing & Validation

### Batch 2.6: Testing & Monitoring

**Estimated Time**: 2-3 hours
**API Token Usage**: Low-Medium

#### Tasks:
- [ ] Create embedding generation tests
- [ ] Add performance monitoring
- [ ] Implement cost tracking
- [ ] Create embedding validation utilities

#### Create `/lib/ai/__tests__/embedding-service.test.ts`:

```typescript
import { embeddingService } from "../embedding-service";
import { dataExtractionService } from "../data-extraction";

describe("EmbeddingService", () => {
  test("should generate embedding for text", async () => {
    const embedding = await embeddingService.generateEmbedding("Test task content");
    
    expect(embedding).toHaveLength(1536); // OpenAI ada-002 dimensions
    expect(embedding[0]).toBeTypeOf("number");
  });

  test("should handle empty content", async () => {
    await expect(embeddingService.generateEmbedding("")).rejects.toThrow();
  });

  test("should use cache for duplicate content", async () => {
    const content = "Duplicate test content";
    
    const start1 = Date.now();
    const embedding1 = await embeddingService.generateEmbedding(content);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    const embedding2 = await embeddingService.generateEmbedding(content);
    const time2 = Date.now() - start2;

    expect(embedding1).toEqual(embedding2);
    expect(time2).toBeLessThan(time1); // Cached should be faster
  });
});
```

#### Create monitoring utilities:
Create `/lib/ai/monitoring.ts`:

```typescript
export class EmbeddingMonitor {
  private static requests = 0;
  private static costs = 0;
  private static errors = 0;

  static trackRequest(tokenCount: number): void {
    this.requests++;
    // OpenAI embedding cost: $0.0001 per 1K tokens
    this.costs += (tokenCount / 1000) * 0.0001;
  }

  static trackError(): void {
    this.errors++;
  }

  static getStats(): {
    requests: number;
    costs: number;
    errors: number;
    errorRate: number;
  } {
    return {
      requests: this.requests,
      costs: this.costs,
      errors: this.errors,
      errorRate: this.requests > 0 ? this.errors / this.requests : 0,
    };
  }

  static reset(): void {
    this.requests = 0;
    this.costs = 0;
    this.errors = 0;
  }
}
```

## Success Criteria

- [ ] Embedding service generates consistent 1536-dimensional vectors
- [ ] Task and board data extraction works correctly
- [ ] Embeddings are stored in PostgreSQL with pgvector
- [ ] Real-time updates trigger embedding regeneration
- [ ] Batch processing completes without errors
- [ ] Cost monitoring and caching reduce API usage
- [ ] All embedding endpoints return proper responses

## Next Steps

After completing Phase 2:
1. Proceed to Phase 3: RAG Implementation
2. Set up production monitoring for embedding generation
3. Configure cost alerts and limits
4. Begin testing semantic search capabilities

## Troubleshooting

### Common Issues:
- **OpenAI API rate limits**: Implement proper batching and delays
- **Vector storage errors**: Check pgvector installation and data types
- **Memory issues**: Process large datasets in smaller batches
- **Embedding consistency**: Ensure content preprocessing is deterministic

### Debug Commands:
```bash
# Test embedding generation
curl -X POST http://localhost:3000/api/ai/embeddings \
  -H "Content-Type: application/json" \
  -d '{"action":"process_single_task","taskId":"test-id"}'

# Check embedding stats
curl -X GET http://localhost:3000/api/ai/embeddings
```