import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod/v3";
import { getMcpUser } from "@/lib/ai/mcp-transport-auth";
import { vectorSearchService } from "@/lib/ai/vector-search";
import db from "@/lib/db";

const handler = createMcpHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (server: any) => {
    // Enhanced semantic search tool
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const searchQuery = {
          query: params.query,
          companyId: mcpUser.companyId!,
          userId: mcpUser.id,
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
                    similarity: Math.round(result.similarity * 100) / 100,
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

    // Hybrid search tool (combines vector + keyword search)
    server.tool(
      "hybrid_search",
      "Perform hybrid search combining semantic and keyword matching",
      {
        query: z.string().min(1, "Query is required"),
        vectorWeight: z.number().min(0).max(1).default(0.7),
        keywordWeight: z.number().min(0).max(1).default(0.3),
        limit: z.number().min(1).max(20).default(10),
        filters: z
          .object({
            boardId: z.string().optional(),
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
          })
          .optional(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        // Validate company context
        const companyId = mcpUser.companyId;
        if (!companyId) {
          throw new Error("Company context required");
        }

        const searchQuery = {
          query: params.query,
          companyId: mcpUser.companyId!,
          userId: mcpUser.id,
          limit: params.limit,
          filters: params.filters
            ? {
                boardIds: params.filters.boardId
                  ? [params.filters.boardId]
                  : undefined,
                priority: params.filters.priority,
                status: params.filters.status,
              }
            : undefined,
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
                  filters: params.filters,
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

    // Get embedding status tool
    server.tool(
      "get_embedding_status",
      "Check the status of task and board embeddings",
      {
        boardId: z.string().optional(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        const taskEmbeddingCount = await db.taskEmbedding.count();
        const boardEmbeddingCount = await db.boardEmbedding.count();

        let boardSpecificCount = 0;
        if (params.boardId) {
          boardSpecificCount = await db.taskEmbedding.count({
            where: {
              task: {
                boardSection: {
                  boardId: params.boardId,
                  board: {
                    access: {
                      has: mcpUser.id,
                    },
                  },
                },
              },
            },
          });
        }

        // Get sample of available tasks for embedding
        const availableTasks = await db.task.count({
          where: {
            boardSection: {
              board: {
                access: {
                  has: mcpUser.id,
                },
              },
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  embeddings: {
                    totalTaskEmbeddings: taskEmbeddingCount,
                    totalBoardEmbeddings: boardEmbeddingCount,
                    boardSpecificTaskEmbeddings: params.boardId
                      ? boardSpecificCount
                      : null,
                    availableTasksForEmbedding: availableTasks,
                    embeddingCoverage:
                      availableTasks > 0
                        ? ((taskEmbeddingCount / availableTasks) * 100).toFixed(
                            1,
                          ) + "%"
                        : "0%",
                  },
                  vectorSearchCapability: {
                    enabled: process.env.PGVECTOR_ENABLED === "true",
                    embeddingModel:
                      process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
                    dimensions: parseInt(
                      process.env.EMBEDDING_DIMENSIONS || "1536",
                    ),
                  },
                  status:
                    taskEmbeddingCount > 0
                      ? "embeddings-available"
                      : "embeddings-pending",
                  message:
                    taskEmbeddingCount > 0
                      ? "Embeddings are available for semantic search"
                      : "No embeddings found. Run embedding generation first.",
                  recommendations:
                    taskEmbeddingCount === 0
                      ? [
                          "Enable pgvector extension in your PostgreSQL database",
                          "Run embedding generation for existing tasks",
                          "Configure OpenAI API key for embedding generation",
                        ]
                      : [
                          "Vector search is ready to use",
                          "Consider batch updating embeddings for better performance",
                        ],
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // Search boards tool
    server.tool(
      "search_boards",
      "Search and filter boards accessible to the user",
      {
        query: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        const mcpUser = await getMcpUser();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = {
          access: {
            has: mcpUser.id,
          },
        };

        if (params.query) {
          whereClause.OR = [
            { name: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
          ];
        }

        const boards = await db.board.findMany({
          where: whereClause,
          take: params.limit,
          include: {
            boardSections: {
              include: {
                _count: {
                  select: { tasks: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  results: boards.map((board) => ({
                    id: board.id,
                    name: board.name,
                    description: board.description,
                    createdAt: board.createdAt,
                    updatedAt: board.updatedAt,
                    sectionsCount: board.boardSections.length,
                    totalTasks: board.boardSections.reduce(
                      (sum, section) => sum + section._count.tasks,
                      0,
                    ),
                    sections: board.boardSections.map((section) => ({
                      id: section.id,
                      name: section.name,
                      taskCount: section._count.tasks,
                    })),
                  })),
                  resultCount: boards.length,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (params: any) => {
        await getMcpUser(); // auth gate

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

    // Vector search health check tool
    server.tool(
      "vector_search_health",
      "Check vector search functionality and status",
      {},
      async () => {
        await getMcpUser(); // auth gate

        const healthStatus = await vectorSearchService.healthCheck();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  health: healthStatus,
                  message: healthStatus.healthy
                    ? "Vector search is operational"
                    : "Vector search has issues",
                  recommendations: healthStatus.healthy
                    ? ["Vector search is ready for use"]
                    : [
                        "Check pgvector installation",
                        "Verify database connectivity",
                      ],
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
        hybrid_search: { description: "Combined vector and keyword search" },
        find_similar_tasks: {
          description: "Find similar tasks by vector similarity",
        },
        vector_search_health: { description: "Vector search health status" },
        get_embedding_status: { description: "Check embedding availability" },
        search_boards: { description: "Search accessible boards" },
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
