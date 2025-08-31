# Phase 3: RAG Implementation

## Overview

This phase implements the core Retrieval-Augmented Generation system, including semantic search, context assembly, and the foundation for intelligent query processing. It builds on the MCP servers and embeddings from Phases 1 and 2.

## Prerequisites

- Completed Phase 1: MCP Server Setup & Vector Database Integration
- Completed Phase 2: Embedding Generation
- Vector embeddings stored in PostgreSQL
- MCP servers operational

## Implementation Batches

### Batch 3.1: Vector Similarity Search Implementation

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Implement vector similarity search functions
- [ ] Create query preprocessing utilities
- [ ] Add similarity threshold management
- [ ] Optimize PostgreSQL vector queries

#### Vector Search Service:

Create `/lib/ai/vector-search.ts`:

```typescript
import db from "@/lib/db";
import { embeddingService } from "./embedding-service";
import { Prisma } from "@prisma/client";

export interface VectorSearchQuery {
  query: string;
  companyId: string;
  userId: string;
  threshold?: number;
  limit?: number;
  filters?: {
    boardIds?: string[];
    priority?: string[];
    status?: string[];
    assigneeIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: any;
  task?: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    boardName: string;
    sectionName: string;
    assignedToName: string;
    createdAt: Date;
    dueDate: Date;
  };
}

export class VectorSearchService {
  private readonly defaultThreshold = 0.7;
  private readonly defaultLimit = 10;

  /**
   * Preprocess search query for better results
   */
  private preprocessQuery(query: string): string {
    // Remove special characters, normalize whitespace
    const cleaned = query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ");

    // Expand common abbreviations
    const expansions: Record<string, string> = {
      ui: "user interface",
      ux: "user experience",
      api: "application programming interface",
      db: "database",
      bug: "error issue problem",
      feat: "feature enhancement",
    };

    let expanded = cleaned;
    Object.entries(expansions).forEach(([abbr, expansion]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, "g");
      expanded = expanded.replace(regex, `${abbr} ${expansion}`);
    });

    return expanded;
  }

  /**
   * Perform semantic search on task embeddings
   */
  async searchTasks(
    searchQuery: VectorSearchQuery,
  ): Promise<VectorSearchResult[]> {
    const {
      query,
      companyId,
      userId,
      threshold = this.defaultThreshold,
      limit = this.defaultLimit,
    } = searchQuery;

    if (!query.trim()) {
      return [];
    }

    try {
      // Generate query embedding
      const processedQuery = this.preprocessQuery(query);
      const queryEmbedding =
        await embeddingService.generateEmbedding(processedQuery);
      const embeddingVector = `[${queryEmbedding.join(",")}]`;

      // Build WHERE clause for filters
      let whereClause = `
        te.embedding IS NOT NULL 
        AND t."assignedToId" IN (
          SELECT id FROM "User" WHERE cid = $2
        )
      `;
      const params: any[] = [embeddingVector, companyId];
      let paramIndex = 3;

      if (searchQuery.filters?.boardIds?.length) {
        whereClause += ` AND bs."boardId" = ANY($${paramIndex})`;
        params.push(searchQuery.filters.boardIds);
        paramIndex++;
      }

      if (searchQuery.filters?.priority?.length) {
        whereClause += ` AND t.priority = ANY($${paramIndex})`;
        params.push(searchQuery.filters.priority);
        paramIndex++;
      }

      if (searchQuery.filters?.status?.length) {
        whereClause += ` AND t.status = ANY($${paramIndex})`;
        params.push(searchQuery.filters.status);
        paramIndex++;
      }

      if (searchQuery.filters?.assigneeIds?.length) {
        whereClause += ` AND t."assignedToId" = ANY($${paramIndex})`;
        params.push(searchQuery.filters.assigneeIds);
        paramIndex++;
      }

      if (searchQuery.filters?.dateRange) {
        whereClause += ` AND t."createdAt" BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(
          searchQuery.filters.dateRange.start,
          searchQuery.filters.dateRange.end,
        );
        paramIndex += 2;
      }

      // Perform vector similarity search
      const searchResults = await db.$queryRawUnsafe(
        `
        WITH similarity_scores AS (
          SELECT 
            te."taskId",
            te.content,
            te.metadata,
            1 - (te.embedding <-> $1::vector) AS similarity
          FROM "task_embeddings" te
          JOIN "Task" t ON te."taskId" = t.id
          JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
          JOIN "Board" b ON bs."boardId" = b.id
          JOIN "User" u ON t."assignedToId" = u.id
          WHERE ${whereClause}
            AND (1 - (te.embedding <-> $1::vector)) >= $${paramIndex}
          ORDER BY similarity DESC
          LIMIT $${paramIndex + 1}
        )
        SELECT 
          s.*,
          t.title,
          t.description,
          t.priority,
          t.status,
          t."createdAt",
          t."dueDate",
          b.name as board_name,
          bs.name as section_name,
          u.name as assigned_to_name
        FROM similarity_scores s
        JOIN "Task" t ON s."taskId" = t.id
        JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
        JOIN "Board" b ON bs."boardId" = b.id
        JOIN "User" u ON t."assignedToId" = u.id
        ORDER BY s.similarity DESC
      `,
        ...params,
        threshold,
        limit,
      );

      // Transform results
      return (searchResults as any[]).map((row) => ({
        id: row.taskId,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
        task: {
          id: row.taskId,
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          boardName: row.board_name,
          sectionName: row.section_name,
          assignedToName: row.assigned_to_name,
          createdAt: new Date(row.createdAt),
          dueDate: new Date(row.dueDate),
        },
      }));
    } catch (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  /**
   * Perform hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    searchQuery: VectorSearchQuery,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
  ): Promise<VectorSearchResult[]> {
    const { query, limit = this.defaultLimit } = searchQuery;

    try {
      // Get vector search results
      const vectorResults = await this.searchTasks({
        ...searchQuery,
        limit: Math.ceil(limit * 1.5), // Get more for combining
      });

      // Get keyword search results
      const keywordResults = await this.keywordSearch(searchQuery);

      // Combine and rerank results
      const combinedResults = this.combineSearchResults(
        vectorResults,
        keywordResults,
        vectorWeight,
        keywordWeight,
      );

      // Return top results
      return combinedResults.slice(0, limit);
    } catch (error) {
      console.error("Hybrid search error:", error);
      throw new Error(`Hybrid search failed: ${error.message}`);
    }
  }

  /**
   * Perform keyword-based search for hybrid functionality
   */
  private async keywordSearch(
    searchQuery: VectorSearchQuery,
  ): Promise<VectorSearchResult[]> {
    const { query, companyId, limit = this.defaultLimit } = searchQuery;

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2)
      .map((term) => `%${term}%`);

    if (searchTerms.length === 0) return [];

    try {
      // Build search conditions for each term
      const searchConditions = searchTerms
        .map(
          (_, index) =>
            `(t.title ILIKE $${index + 2} OR t.description ILIKE $${index + 2})`,
        )
        .join(" AND ");

      const keywordResults = await db.$queryRawUnsafe(
        `
        SELECT 
          t.id as "taskId",
          CONCAT(t.title, ' ', t.description) as content,
          '{}' as metadata,
          t.title,
          t.description,
          t.priority,
          t.status,
          t."createdAt",
          t."dueDate",
          b.name as board_name,
          bs.name as section_name,
          u.name as assigned_to_name,
          -- Calculate keyword relevance score
          CASE 
            WHEN t.title ILIKE ANY($${searchTerms.length + 2}) THEN 1.0
            ELSE 0.8
          END as similarity
        FROM "Task" t
        JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
        JOIN "Board" b ON bs."boardId" = b.id
        JOIN "User" u ON t."assignedToId" = u.id
        WHERE u.cid = $1
          AND (${searchConditions})
        ORDER BY similarity DESC
        LIMIT $${searchTerms.length + 3}
      `,
        companyId,
        ...searchTerms,
        searchTerms,
        limit,
      );

      return (keywordResults as any[]).map((row) => ({
        id: row.taskId,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: JSON.parse(row.metadata),
        task: {
          id: row.taskId,
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          boardName: row.board_name,
          sectionName: row.section_name,
          assignedToName: row.assigned_to_name,
          createdAt: new Date(row.createdAt),
          dueDate: new Date(row.dueDate),
        },
      }));
    } catch (error) {
      console.error("Keyword search error:", error);
      return [];
    }
  }

  /**
   * Combine vector and keyword search results with weighted scoring
   */
  private combineSearchResults(
    vectorResults: VectorSearchResult[],
    keywordResults: VectorSearchResult[],
    vectorWeight: number,
    keywordWeight: number,
  ): VectorSearchResult[] {
    const resultMap = new Map<string, VectorSearchResult>();

    // Add vector results
    vectorResults.forEach((result) => {
      resultMap.set(result.id, {
        ...result,
        similarity: result.similarity * vectorWeight,
      });
    });

    // Add or combine keyword results
    keywordResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores
        existing.similarity += result.similarity * keywordWeight;
      } else {
        resultMap.set(result.id, {
          ...result,
          similarity: result.similarity * keywordWeight,
        });
      }
    });

    // Sort by combined score
    return Array.from(resultMap.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );
  }

  /**
   * Get similar tasks for recommendation
   */
  async findSimilarTasks(
    taskId: string,
    limit = 5,
  ): Promise<VectorSearchResult[]> {
    try {
      const taskEmbedding = await db.taskEmbedding.findUnique({
        where: { taskId },
        include: {
          task: {
            include: {
              assignedTo: true,
            },
          },
        },
      });

      if (!taskEmbedding) {
        throw new Error("Task embedding not found");
      }

      // Find similar tasks
      const similarTasks = await db.$queryRawUnsafe(
        `
        SELECT 
          te."taskId",
          te.content,
          te.metadata,
          1 - (te.embedding <-> $1) AS similarity,
          t.title,
          t.description,
          t.priority,
          t.status,
          t."createdAt",
          t."dueDate",
          b.name as board_name,
          bs.name as section_name,
          u.name as assigned_to_name
        FROM "task_embeddings" te
        JOIN "Task" t ON te."taskId" = t.id
        JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
        JOIN "Board" b ON bs."boardId" = b.id
        JOIN "User" u ON t."assignedToId" = u.id
        WHERE te."taskId" != $2
          AND u.cid = $3
          AND 1 - (te.embedding <-> $1) > 0.5
        ORDER BY similarity DESC
        LIMIT $4
      `,
        taskEmbedding.embedding,
        taskId,
        taskEmbedding.task.assignedTo.cid,
        limit,
      );

      return (similarTasks as any[]).map((row) => ({
        id: row.taskId,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
        task: {
          id: row.taskId,
          title: row.title,
          description: row.description,
          priority: row.priority,
          status: row.status,
          boardName: row.board_name,
          sectionName: row.section_name,
          assignedToName: row.assigned_to_name,
          createdAt: new Date(row.createdAt),
          dueDate: new Date(row.dueDate),
        },
      }));
    } catch (error) {
      console.error("Similar tasks search error:", error);
      throw new Error(`Similar tasks search failed: ${error.message}`);
    }
  }
}

export const vectorSearchService = new VectorSearchService();
```

### Batch 3.2: Enhanced Vector Search MCP Server

**Estimated Time**: 2-3 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Update Vector Search MCP server with real vector search
- [ ] Add hybrid search tools
- [ ] Implement similarity-based recommendations
- [ ] Add search result ranking

#### Update `/app/api/mcp/search/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import { vectorSearchService } from "@/lib/ai/vector-search";

const handler = createMcpHandler(
  async (server) => {
    server.info({
      name: "TaskHQ Vector Search MCP Server v2.0",
      version: "2.0.0",
      description: "Enhanced MCP server for semantic and hybrid search",
    });

    // Enhanced vector search tool
    server.tool(
      "semantic_search_tasks",
      "Perform semantic search using vector embeddings",
      {
        query: z.string().min(1, "Query is required"),
        threshold: z.number().min(0).max(1).default(0.7),
        limit: z.number().min(1).max(50).default(10),
        filters: z
          .object({
            boardIds: z.array(z.string()).optional(),
            priority: z
              .array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
              .optional(),
            status: z
              .array(
                z.enum([
                  "NEW",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "CANCELLED",
                  "ON_HOLD",
                ]),
              )
              .optional(),
            assigneeIds: z.array(z.string()).optional(),
            dateRange: z
              .object({
                start: z.string(),
                end: z.string(),
              })
              .optional(),
          })
          .optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const searchQuery = {
          query: params.query,
          companyId: session.user.cid!,
          userId: session.user.id,
          threshold: params.threshold,
          limit: params.limit,
          filters: params.filters
            ? {
                ...params.filters,
                dateRange: params.filters.dateRange
                  ? {
                      start: new Date(params.filters.dateRange.start),
                      end: new Date(params.filters.dateRange.end),
                    }
                  : undefined,
              }
            : undefined,
        };

        const results = await vectorSearchService.searchTasks(searchQuery);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  results: results.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100, // Round to 2 decimals
                  })),
                  resultCount: results.length,
                  searchType: "semantic-vector",
                  threshold: params.threshold,
                  message: `Found ${results.length} semantically similar tasks`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // Hybrid search tool
    server.tool(
      "hybrid_search_tasks",
      "Perform hybrid search combining semantic and keyword matching",
      {
        query: z.string().min(1, "Query is required"),
        vectorWeight: z.number().min(0).max(1).default(0.7),
        keywordWeight: z.number().min(0).max(1).default(0.3),
        threshold: z.number().min(0).max(1).default(0.6),
        limit: z.number().min(1).max(50).default(15),
        filters: z
          .object({
            boardIds: z.array(z.string()).optional(),
            priority: z
              .array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
              .optional(),
            status: z
              .array(
                z.enum([
                  "NEW",
                  "IN_PROGRESS",
                  "COMPLETED",
                  "CANCELLED",
                  "ON_HOLD",
                ]),
              )
              .optional(),
            assigneeIds: z.array(z.string()).optional(),
          })
          .optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const searchQuery = {
          query: params.query,
          companyId: session.user.cid!,
          userId: session.user.id,
          threshold: params.threshold,
          limit: params.limit,
          filters: params.filters,
        };

        const results = await vectorSearchService.hybridSearch(
          searchQuery,
          params.vectorWeight,
          params.keywordWeight,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  searchWeights: {
                    vector: params.vectorWeight,
                    keyword: params.keywordWeight,
                  },
                  results: results.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100,
                  })),
                  resultCount: results.length,
                  searchType: "hybrid",
                  message: `Found ${results.length} relevant tasks using hybrid search`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // Find similar tasks tool
    server.tool(
      "find_similar_tasks",
      "Find tasks similar to a given task using vector similarity",
      {
        taskId: z.string().min(1, "Task ID is required"),
        limit: z.number().min(1).max(20).default(5),
        threshold: z.number().min(0).max(1).default(0.5),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const results = await vectorSearchService.findSimilarTasks(
          params.taskId,
          params.limit,
        );

        // Filter by threshold
        const filteredResults = results.filter(
          (result) => result.similarity >= params.threshold,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  sourceTaskId: params.taskId,
                  results: filteredResults.map((result) => ({
                    ...result,
                    similarity: Math.round(result.similarity * 100) / 100,
                  })),
                  resultCount: filteredResults.length,
                  searchType: "similarity-based",
                  threshold: params.threshold,
                  message: `Found ${filteredResults.length} similar tasks`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // Search analytics tool
    server.tool(
      "search_analytics",
      "Get analytics about search patterns and results quality",
      {
        companyId: z.string().optional(),
        timeRange: z.enum(["day", "week", "month"]).default("week"),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // This would typically query search logs/analytics
        // For now, providing a placeholder structure
        const analytics = {
          totalSearches: 0, // Would come from search logs
          avgResultsPerSearch: 0,
          commonQueries: [],
          searchSuccessRate: 0,
          avgSimilarityScores: 0,
          timeRange: params.timeRange,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  analytics,
                  message: "Search analytics retrieved (placeholder data)",
                  note: "Full analytics implementation pending search logging infrastructure",
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );
  },
  {
    capabilities: {
      tools: {
        semantic_search_tasks: { description: "Vector-based semantic search" },
        hybrid_search_tasks: {
          description: "Combined vector and keyword search",
        },
        find_similar_tasks: {
          description: "Find similar tasks by vector similarity",
        },
        search_analytics: {
          description: "Search patterns and quality analytics",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
    maxDuration: parseInt(process.env.MCP_MAX_DURATION || "800"),
  },
);

export { handler as GET, handler as POST, handler as DELETE };
```

### Batch 3.3: Context Assembly & Prompt Management

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium-High

#### Tasks:

- [ ] Create context assembly service
- [ ] Design prompt templates for different query types
- [ ] Implement context window management
- [ ] Add relevance scoring and ranking

#### Context Assembly Service:

Create `/lib/ai/context-assembly.ts`:

```typescript
import { VectorSearchResult, vectorSearchService } from "./vector-search";
import { aiConfig } from "./config";

export interface RAGContext {
  query: string;
  companyId: string;
  userId: string;
  boardId?: string;
  taskId?: string;
  contextType:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation";
  maxTokens?: number;
}

export interface AssembledContext {
  systemPrompt: string;
  contextDocuments: VectorSearchResult[];
  userPrompt: string;
  totalTokens: number;
  relevanceScore: number;
  contextSummary: string;
}

export interface PromptTemplate {
  type:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation"
    | "troubleshooting";
  systemPrompt: string;
  contextTemplate: string;
  userQueryTemplate: string;
  maxTokens: number;
  requiredContext: string[];
  optionalContext: string[];
}

export class ContextAssemblyService {
  private readonly maxContextTokens = 6000; // Leave room for response
  private readonly avgTokensPerChar = 0.25; // Rough estimate

  private readonly promptTemplates: Record<string, PromptTemplate> = {
    general: {
      type: "general",
      systemPrompt: `You are an intelligent project management assistant for TaskHQ. You help users manage their tasks, analyze project progress, and make data-driven decisions.

Key capabilities:
- Search and analyze tasks across projects
- Provide project insights and recommendations
- Help with task prioritization and assignment
- Track project progress and identify bottlenecks

Always base your responses on the provided context and be specific about the data you're referencing.`,
      contextTemplate: `## Relevant Tasks and Projects

{context}

## Task Summary
- Total relevant tasks: {taskCount}
- Priority distribution: {priorityBreakdown}
- Status distribution: {statusBreakdown}
- Average relevance score: {avgRelevance}`,
      userQueryTemplate: `Based on the above context, please help me with: {query}`,
      maxTokens: 8000,
      requiredContext: ["tasks"],
      optionalContext: ["boards", "users", "history"],
    },

    task_specific: {
      type: "task_specific",
      systemPrompt: `You are a task management expert helping with specific task analysis and recommendations.

Focus areas:
- Task details and context analysis
- Progress tracking and blockers
- Related tasks and dependencies
- Assignment and priority optimization

Be specific and actionable in your recommendations.`,
      contextTemplate: `## Task Context

{context}

## Related Tasks
{relatedTasks}

## Task Analytics
- Similar tasks found: {similarTaskCount}
- Context relevance: {avgRelevance}
- Board context: {boardInfo}`,
      userQueryTemplate: `Regarding the task context above: {query}`,
      maxTokens: 6000,
      requiredContext: ["task", "relatedTasks"],
      optionalContext: ["board", "assignee"],
    },

    board_analysis: {
      type: "board_analysis",
      systemPrompt: `You are a project analytics specialist providing insights on project boards and team performance.

Analysis areas:
- Project health and progress tracking
- Team workload and efficiency
- Bottleneck identification
- Resource optimization recommendations
- Timeline and milestone analysis

Provide data-driven insights with specific metrics when available.`,
      contextTemplate: `## Project Board Analysis

{context}

## Board Metrics
- Total tasks: {taskCount}
- Completion rate: {completionRate}%
- Team size: {teamSize}
- Priority distribution: {priorityBreakdown}
- Status distribution: {statusBreakdown}
- Average task age: {avgTaskAge} days`,
      userQueryTemplate: `Based on the project analysis above: {query}`,
      maxTokens: 10000,
      requiredContext: ["board", "tasks"],
      optionalContext: ["team", "metrics", "history"],
    },

    recommendation: {
      type: "recommendation",
      systemPrompt: `You are an AI assistant specialized in providing actionable project management recommendations.

Recommendation types:
- Task prioritization and scheduling
- Resource allocation and assignments
- Process improvements
- Risk mitigation strategies
- Performance optimization

Always provide specific, actionable recommendations with clear reasoning.`,
      contextTemplate: `## Current Project State

{context}

## Analysis Summary
- Context scope: {contextScope}
- Data points analyzed: {dataPointCount}
- Confidence level: {confidenceLevel}`,
      userQueryTemplate: `Please provide recommendations for: {query}`,
      maxTokens: 8000,
      requiredContext: ["context"],
      optionalContext: ["metrics", "trends", "comparisons"],
    },

    troubleshooting: {
      type: "troubleshooting",
      systemPrompt: `You are a project troubleshooting expert helping identify and resolve project management issues.

Troubleshooting areas:
- Project bottlenecks and blockers
- Team productivity issues
- Process inefficiencies
- Resource allocation problems
- Timeline and deadline challenges

Provide root cause analysis and actionable solutions.`,
      contextTemplate: `## Problem Context

{context}

## Issue Indicators
- Related tasks: {taskCount}
- Problem scope: {problemScope}
- Affected areas: {affectedAreas}`,
      userQueryTemplate: `Please help troubleshoot this issue: {query}`,
      maxTokens: 7000,
      requiredContext: ["problem_context"],
      optionalContext: ["related_tasks", "metrics", "history"],
    },
  };

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length * this.avgTokensPerChar);
  }

  /**
   * Retrieve relevant context based on query
   */
  private async retrieveRelevantContext(
    ragContext: RAGContext,
  ): Promise<VectorSearchResult[]> {
    const searchQuery = {
      query: ragContext.query,
      companyId: ragContext.companyId,
      userId: ragContext.userId,
      threshold: 0.6,
      limit: 20,
      filters: ragContext.boardId
        ? { boardIds: [ragContext.boardId] }
        : undefined,
    };

    try {
      // Use hybrid search for better results
      return await vectorSearchService.hybridSearch(searchQuery, 0.7, 0.3);
    } catch (error) {
      console.error("Context retrieval error:", error);
      // Fallback to empty context
      return [];
    }
  }

  /**
   * Calculate relevance score for context documents
   */
  private calculateContextRelevance(documents: VectorSearchResult[]): number {
    if (documents.length === 0) return 0;

    const avgSimilarity =
      documents.reduce((sum, doc) => sum + doc.similarity, 0) /
      documents.length;
    const diversityBonus = Math.min(documents.length / 10, 0.1); // Bonus for diverse results

    return Math.min(avgSimilarity + diversityBonus, 1);
  }

  /**
   * Build context summary statistics
   */
  private buildContextSummary(documents: VectorSearchResult[]): {
    taskCount: number;
    priorityBreakdown: string;
    statusBreakdown: string;
    avgRelevance: string;
    boardInfo: string;
  } {
    const priorityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const boards = new Set<string>();

    documents.forEach((doc) => {
      if (doc.task) {
        priorityCounts[doc.task.priority] =
          (priorityCounts[doc.task.priority] || 0) + 1;
        statusCounts[doc.task.status] =
          (statusCounts[doc.task.status] || 0) + 1;
        boards.add(doc.task.boardName);
      }
    });

    const avgRelevance =
      documents.length > 0
        ? documents.reduce((sum, doc) => sum + doc.similarity, 0) /
          documents.length
        : 0;

    return {
      taskCount: documents.length,
      priorityBreakdown:
        Object.entries(priorityCounts)
          .map(([priority, count]) => `${priority}: ${count}`)
          .join(", ") || "None",
      statusBreakdown:
        Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(", ") || "None",
      avgRelevance: (avgRelevance * 100).toFixed(1) + "%",
      boardInfo: Array.from(boards).join(", ") || "No boards",
    };
  }

  /**
   * Format context documents for inclusion in prompt
   */
  private formatContextDocuments(documents: VectorSearchResult[]): string {
    if (documents.length === 0) {
      return "No relevant tasks found in the current context.";
    }

    return documents
      .slice(0, 10) // Limit to top 10 most relevant
      .map((doc, index) => {
        const task = doc.task;
        if (!task)
          return `${index + 1}. ${doc.content} (Relevance: ${(doc.similarity * 100).toFixed(1)}%)`;

        return `${index + 1}. **${task.title}** [${task.priority}] [${task.status}]
   Board: ${task.boardName} → ${task.sectionName}
   Assigned: ${task.assignedToName}
   Due: ${task.dueDate.toLocaleDateString()}
   Description: ${task.description || "No description"}
   Relevance: ${(doc.similarity * 100).toFixed(1)}%
   ---`;
      })
      .join("\n\n");
  }

  /**
   * Trim context to fit within token limits
   */
  private trimContextToFit(
    documents: VectorSearchResult[],
    template: PromptTemplate,
    query: string,
  ): { documents: VectorSearchResult[]; estimatedTokens: number } {
    const basePromptTokens = this.estimateTokenCount(
      template.systemPrompt +
        template.userQueryTemplate.replace("{query}", query),
    );
    const availableTokens = template.maxTokens - basePromptTokens - 500; // Buffer for response

    let totalTokens = 0;
    const trimmedDocs: VectorSearchResult[] = [];

    for (const doc of documents) {
      const docTokens = this.estimateTokenCount(this.formatSingleDocument(doc));

      if (totalTokens + docTokens <= availableTokens) {
        trimmedDocs.push(doc);
        totalTokens += docTokens;
      } else {
        break;
      }
    }

    return {
      documents: trimmedDocs,
      estimatedTokens: totalTokens + basePromptTokens,
    };
  }

  /**
   * Format a single document for token estimation
   */
  private formatSingleDocument(doc: VectorSearchResult): string {
    if (!doc.task) return doc.content;

    return `**${doc.task.title}** [${doc.task.priority}] [${doc.task.status}]
Board: ${doc.task.boardName} → ${doc.task.sectionName}
Assigned: ${doc.task.assignedToName}
Description: ${doc.task.description || "No description"}`;
  }

  /**
   * Assemble complete context for RAG query
   */
  async assembleContext(ragContext: RAGContext): Promise<AssembledContext> {
    const template =
      this.promptTemplates[ragContext.contextType] ||
      this.promptTemplates.general;

    // Retrieve relevant documents
    const allDocuments = await this.retrieveRelevantContext(ragContext);

    // Trim to fit token limits
    const { documents, estimatedTokens } = this.trimContextToFit(
      allDocuments,
      template,
      ragContext.query,
    );

    // Build context summary
    const summary = this.buildContextSummary(documents);

    // Format context documents
    const formattedContext = this.formatContextDocuments(documents);

    // Build complete context template
    const contextTemplate = template.contextTemplate
      .replace("{context}", formattedContext)
      .replace("{taskCount}", summary.taskCount.toString())
      .replace("{priorityBreakdown}", summary.priorityBreakdown)
      .replace("{statusBreakdown}", summary.statusBreakdown)
      .replace("{avgRelevance}", summary.avgRelevance)
      .replace("{boardInfo}", summary.boardInfo);

    // Build user prompt
    const userPrompt = template.userQueryTemplate.replace(
      "{query}",
      ragContext.query,
    );

    // Calculate relevance score
    const relevanceScore = this.calculateContextRelevance(documents);

    // Build context summary string
    const contextSummary = `Retrieved ${documents.length} relevant tasks with ${summary.avgRelevance} average relevance from ${summary.boardInfo}`;

    return {
      systemPrompt: template.systemPrompt + "\n\n" + contextTemplate,
      contextDocuments: documents,
      userPrompt,
      totalTokens: estimatedTokens,
      relevanceScore,
      contextSummary,
    };
  }

  /**
   * Get available prompt templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(this.promptTemplates);
  }

  /**
   * Get template details
   */
  getTemplate(type: string): PromptTemplate | undefined {
    return this.promptTemplates[type];
  }
}

export const contextAssemblyService = new ContextAssemblyService();
```

### Batch 3.4: RAG Query Processing Engine

**Estimated Time**: 2-3 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Create RAG query processing service
- [ ] Implement query classification
- [ ] Add response post-processing
- [ ] Create query optimization utilities

#### RAG Processing Service:

Create `/lib/ai/rag-processor.ts`:

```typescript
import { generateText, generateObject } from "ai";
import { aiConfig } from "./config";
import {
  contextAssemblyService,
  RAGContext,
  AssembledContext,
} from "./context-assembly";
import { z } from "zod";

export interface RAGQuery {
  query: string;
  companyId: string;
  userId: string;
  boardId?: string;
  taskId?: string;
  contextType?:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation";
  options?: {
    includeContext?: boolean;
    maxTokens?: number;
    temperature?: number;
    includeSources?: boolean;
  };
}

export interface RAGResponse {
  response: string;
  confidence: number;
  sources: Array<{
    taskId: string;
    title: string;
    relevance: number;
    boardName: string;
  }>;
  contextSummary: string;
  suggestedActions?: Array<{
    type: "task" | "assignment" | "priority" | "schedule";
    description: string;
    reasoning: string;
  }>;
  queryClassification: string;
  processingTime: number;
}

export class RAGProcessor {
  /**
   * Classify query to determine the best approach
   */
  private async classifyQuery(query: string): Promise<{
    type: "general" | "task_specific" | "board_analysis" | "recommendation";
    confidence: number;
    reasoning: string;
  }> {
    const classificationPrompt = `Classify this project management query into one of these categories:
- general: General questions about tasks, projects, or project management
- task_specific: Questions about specific tasks, task details, or task-related actions  
- board_analysis: Questions about project health, progress, team performance, or analytics
- recommendation: Requests for suggestions, recommendations, or optimization advice

Query: "${query}"

Respond with the category name and confidence (0-1).`;

    try {
      const result = await generateObject({
        model: aiConfig.chatModel,
        system:
          "You are a query classification expert. Analyze queries and categorize them accurately.",
        prompt: classificationPrompt,
        schema: z.object({
          type: z.enum([
            "general",
            "task_specific",
            "board_analysis",
            "recommendation",
          ]),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
        }),
        temperature: 0.1, // Low temperature for consistent classification
      });

      return result.object;
    } catch (error) {
      console.error("Query classification error:", error);
      // Fallback to general classification
      return {
        type: "general",
        confidence: 0.5,
        reasoning: "Fallback classification due to processing error",
      };
    }
  }

  /**
   * Process RAG query and generate response
   */
  async processQuery(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Classify the query
      const classification = await this.classifyQuery(ragQuery.query);

      // Step 2: Determine context type
      const contextType = ragQuery.contextType || classification.type;

      // Step 3: Assemble context
      const ragContext: RAGContext = {
        query: ragQuery.query,
        companyId: ragQuery.companyId,
        userId: ragQuery.userId,
        boardId: ragQuery.boardId,
        taskId: ragQuery.taskId,
        contextType,
        maxTokens: ragQuery.options?.maxTokens || 8000,
      };

      const assembledContext =
        await contextAssemblyService.assembleContext(ragContext);

      // Step 4: Generate response
      const response = await this.generateResponse(assembledContext, ragQuery);

      // Step 5: Extract sources
      const sources = assembledContext.contextDocuments
        .slice(0, 5) // Top 5 sources
        .map((doc) => ({
          taskId: doc.id,
          title: doc.task?.title || "Unknown task",
          relevance: Math.round(doc.similarity * 100) / 100,
          boardName: doc.task?.boardName || "Unknown board",
        }));

      // Step 6: Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        ragQuery.query,
        assembledContext.contextDocuments,
        contextType,
      );

      const processingTime = Date.now() - startTime;

      return {
        response: response.text,
        confidence: assembledContext.relevanceScore,
        sources,
        contextSummary: assembledContext.contextSummary,
        suggestedActions,
        queryClassification: classification.type,
        processingTime,
      };
    } catch (error) {
      console.error("RAG processing error:", error);

      const processingTime = Date.now() - startTime;

      return {
        response:
          "I apologize, but I encountered an error while processing your query. Please try rephrasing your question or contact support if the issue persists.",
        confidence: 0,
        sources: [],
        contextSummary: "Error occurred during context retrieval",
        suggestedActions: [],
        queryClassification: "error",
        processingTime,
      };
    }
  }

  /**
   * Generate the main response using assembled context
   */
  private async generateResponse(
    context: AssembledContext,
    ragQuery: RAGQuery,
  ) {
    const options = ragQuery.options || {};

    return await generateText({
      model: aiConfig.chatModel,
      system: context.systemPrompt,
      prompt: context.userPrompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    });
  }

  /**
   * Generate suggested actions based on context
   */
  private async generateSuggestedActions(
    query: string,
    contextDocs: any[],
    contextType: string,
  ): Promise<
    Array<{
      type: "task" | "assignment" | "priority" | "schedule";
      description: string;
      reasoning: string;
    }>
  > {
    if (contextDocs.length === 0) return [];

    try {
      const result = await generateObject({
        model: aiConfig.chatModel,
        system: `You are an AI assistant that suggests actionable next steps for project management queries.
        
Based on the query type "${contextType}" and the context provided, suggest 1-3 specific actions that would be helpful.`,
        prompt: `Query: "${query}"

Available context: ${contextDocs.length} relevant tasks found.

Generate actionable suggestions that would help address this query.`,
        schema: z.object({
          suggestions: z
            .array(
              z.object({
                type: z.enum(["task", "assignment", "priority", "schedule"]),
                description: z.string(),
                reasoning: z.string(),
              }),
            )
            .max(3),
        }),
        temperature: 0.6,
      });

      return result.object.suggestions;
    } catch (error) {
      console.error("Suggested actions generation error:", error);
      return [];
    }
  }

  /**
   * Batch process multiple queries
   */
  async processQueries(queries: RAGQuery[]): Promise<RAGResponse[]> {
    // Process queries in parallel but with limited concurrency
    const batchSize = 3;
    const results: RAGResponse[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((query) => this.processQuery(query)),
      );
      results.push(...batchResults);

      // Small delay between batches to manage API rate limits
      if (i + batchSize < queries.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalQueries: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  } {
    // This would typically be implemented with proper metrics collection
    return {
      totalQueries: 0,
      averageProcessingTime: 0,
      successRate: 1.0,
      errorRate: 0.0,
    };
  }
}

export const ragProcessor = new RAGProcessor();
```

## Testing & Validation

### Batch 3.5: RAG Testing & Quality Assurance

**Estimated Time**: 2-3 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Create RAG response quality tests
- [ ] Implement search accuracy validation
- [ ] Add performance benchmarking
- [ ] Create integration tests

#### Create `/lib/ai/__tests__/rag-processor.test.ts`:

```typescript
import { ragProcessor } from "../rag-processor";
import { contextAssemblyService } from "../context-assembly";
import { vectorSearchService } from "../vector-search";

describe("RAG System Integration Tests", () => {
  const testCompanyId = "test-company-123";
  const testUserId = "test-user-456";

  test("should process general query correctly", async () => {
    const query = {
      query: "What tasks are overdue in my projects?",
      companyId: testCompanyId,
      userId: testUserId,
      contextType: "general" as const,
    };

    const response = await ragProcessor.processQuery(query);

    expect(response.response).toBeTruthy();
    expect(response.confidence).toBeGreaterThanOrEqual(0);
    expect(response.queryClassification).toBe("general");
    expect(response.processingTime).toBeGreaterThan(0);
  });

  test("should handle empty search results gracefully", async () => {
    const query = {
      query: "absolutely nonexistent impossible task query xyz123",
      companyId: testCompanyId,
      userId: testUserId,
    };

    const response = await ragProcessor.processQuery(query);

    expect(response.response).toBeTruthy();
    expect(response.sources).toHaveLength(0);
    expect(response.confidence).toBe(0);
  });

  test("should provide relevant sources in response", async () => {
    const query = {
      query: "Show me high priority tasks",
      companyId: testCompanyId,
      userId: testUserId,
      options: { includeSources: true },
    };

    const response = await ragProcessor.processQuery(query);

    if (response.sources.length > 0) {
      expect(response.sources[0]).toHaveProperty("taskId");
      expect(response.sources[0]).toHaveProperty("title");
      expect(response.sources[0]).toHaveProperty("relevance");
      expect(response.sources[0].relevance).toBeGreaterThan(0);
    }
  });
});

describe("Context Assembly Tests", () => {
  test("should assemble context within token limits", async () => {
    const ragContext = {
      query: "What are my current tasks?",
      companyId: "test-company",
      userId: "test-user",
      contextType: "general" as const,
      maxTokens: 4000,
    };

    const context = await contextAssemblyService.assembleContext(ragContext);

    expect(context.totalTokens).toBeLessThanOrEqual(4000);
    expect(context.systemPrompt).toBeTruthy();
    expect(context.userPrompt).toBeTruthy();
  });

  test("should calculate relevance scores correctly", async () => {
    const ragContext = {
      query: "high priority urgent tasks",
      companyId: "test-company",
      userId: "test-user",
      contextType: "general" as const,
    };

    const context = await contextAssemblyService.assembleContext(ragContext);

    expect(context.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(context.relevanceScore).toBeLessThanOrEqual(1);
  });
});
```

## Success Criteria

- [ ] Vector similarity search returns accurate results with proper scoring
- [ ] Hybrid search combines vector and keyword results effectively
- [ ] Context assembly stays within token limits while maximizing relevance
- [ ] RAG processor generates coherent responses with proper citations
- [ ] Query classification achieves >80% accuracy on test queries
- [ ] Average response time is under 3 seconds
- [ ] System handles edge cases (empty results, long queries) gracefully

## Next Steps

After completing Phase 3:

1. Proceed to Phase 4: AI Agent Architecture
2. Set up production monitoring for RAG performance
3. Implement user feedback collection for response quality
4. Begin integration with frontend components

## Troubleshooting

### Common Issues:

- **Vector search errors**: Check pgvector installation and embedding format
- **Context assembly timeout**: Reduce maxTokens or limit document count
- **Poor relevance scores**: Adjust similarity thresholds and search parameters
- **Token limit exceeded**: Implement better context trimming logic

### Debug Commands:

```bash
# Test vector search directly
curl -X POST http://localhost:3000/api/mcp/search/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"semantic_search_tasks","arguments":{"query":"test query","limit":5}},"id":1}'

# Test RAG processing
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What are my current tasks?"}]}'
```
