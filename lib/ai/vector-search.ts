import db from "@/lib/db";
import { embeddingService } from "./embedding-service";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    searchQuery: VectorSearchQuery
  ): Promise<VectorSearchResult[]> {
    const {
      query,
      companyId,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        whereClause += ` AND t."createdAt" BETWEEN $${paramIndex} AND $${
          paramIndex + 1
        }`;
        params.push(
          searchQuery.filters.dateRange.start,
          searchQuery.filters.dateRange.end
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
        limit
      );

      // Transform results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      throw new Error(
        `Vector search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Perform hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    searchQuery: VectorSearchQuery,
    vectorWeight = 0.7,
    keywordWeight = 0.3
  ): Promise<VectorSearchResult[]> {
    const { limit = this.defaultLimit } = searchQuery;

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
        keywordWeight
      );

      // Return top results
      return combinedResults.slice(0, limit);
    } catch (error) {
      console.error("Hybrid search error:", error);
      throw new Error(
        `Hybrid search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Perform keyword-based search for hybrid functionality
   */
  private async keywordSearch(
    searchQuery: VectorSearchQuery
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
            `(t.title ILIKE $${index + 2} OR t.description ILIKE $${index + 2})`
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
        limit
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    keywordWeight: number
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
      (a, b) => b.similarity - a.similarity
    );
  }

  /**
   * Get similar tasks for recommendation
   */
  async findSimilarTasks(
    taskId: string,
    limit = 5
  ): Promise<VectorSearchResult[]> {
    try {
      // Temporarily disabled due to Prisma vector field compatibility issues
      // TODO: Resolve Prisma + pgvector integration
      console.log(`Would find similar tasks for ${taskId}, limit: ${limit}`);

      // Return empty results for now
      return [];
    } catch (error) {
      console.error("Similar tasks search error:", error);
      throw new Error(
        `Similar tasks search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Health check for vector search functionality
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    vectorSearchEnabled: boolean;
    error?: string;
  }> {
    try {
      // Test basic database connectivity
      await db.$queryRaw`SELECT 1`;

      // Test pgvector extension
      await db.$queryRaw`SELECT '[1,2,3]'::vector`;

      return {
        healthy: true,
        vectorSearchEnabled: true,
      };
    } catch (error) {
      return {
        healthy: false,
        vectorSearchEnabled: false,
        error:
          error instanceof Error ? error.message : "Unknown health check error",
      };
    }
  }

  /**
   * Find similar boards using raw SQL with company filtering
   */
  async findSimilarBoardsTyped(
    queryEmbedding: number[],
    companyId: string,
    limit = 10
  ): Promise<
    Array<{
      boardId: string;
      name: string;
      description: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }>
  > {
    try {
      const embeddingVector = `[${queryEmbedding.join(",")}]`;
      // Use raw SQL with proper company filtering
      const results = await db.$queryRawUnsafe(
        `
        SELECT 
          be.board_id,
          b.name,
          b.description,
          be.content,
          be.metadata,
          1 - (be.embedding <=> $1::vector) AS similarity
        FROM board_embeddings be
        JOIN "Board" b ON be.board_id = b.id
        JOIN "User" u ON u.id = ANY(b.access)
        WHERE u.cid = $2
        ORDER BY be.embedding <=> $1::vector
        LIMIT $3
        `,
        embeddingVector, 
        companyId, 
        limit
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (results as any[]).map(result => ({
        boardId: result.board_id,
        name: result.name,
        description: result.description || '',
        content: result.content,
        metadata: result.metadata as Record<string, unknown>,
        similarity: result.similarity || 0,
      }));
    } catch (error) {
      console.error("Error finding similar boards with company filtering:", error);
      return [];
    }
  }

  /**
   * Find similar tasks using raw SQL with company filtering
   */
  async findSimilarTasksTyped(
    queryEmbedding: number[],
    companyId: string,
    limit = 10
  ): Promise<
    Array<{
      taskId: string;
      title: string;
      description: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }>
  > {
    try {
      const embeddingVector = `[${queryEmbedding.join(",")}]`;
      // Use raw SQL with proper company filtering
      const results = await db.$queryRawUnsafe(
        `
        SELECT 
          te.task_id,
          t.title,
          t.description,
          te.content,
          te.metadata,
          1 - (te.embedding <=> $1::vector) AS similarity
        FROM task_embeddings te
        JOIN "Task" t ON te.task_id = t.id
        JOIN "User" u ON t.assigned_to_id = u.id
        WHERE u.cid = $2
        ORDER BY te.embedding <=> $1::vector
        LIMIT $3
        `,
        embeddingVector, 
        companyId, 
        limit
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (results as any[]).map(result => ({
        taskId: result.task_id,
        title: result.title,
        description: result.description,
        content: result.content,
        metadata: result.metadata as Record<string, unknown>,
        similarity: result.similarity || 0,
      }));
    } catch (error) {
      console.error("Error finding similar tasks with company filtering:", error);
      return [];
    }
  }
}

export const vectorSearchService = new VectorSearchService();
