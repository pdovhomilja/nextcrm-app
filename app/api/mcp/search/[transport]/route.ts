import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";

const handler = createMcpHandler(
  async (server) => {
    // Vector similarity search tool
    server.tool(
      "vector_search_tasks",
      "Perform semantic search on task embeddings",
      {
        query: z.string().min(1, "Query is required"),
        threshold: z.number().min(0).max(1).default(0.7),
        limit: z.number().min(1).max(20).default(5),
        boardId: z.string().optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // Validate company context
        const companyId = session.user.cid;
        if (!companyId) {
          throw new Error("Company context required");
        }

        // For now, implement basic text search until embeddings are generated
        // This will be replaced with actual vector similarity search in Phase 2
        const queryParam = `%${params.query}%`;

        interface SearchResult {
          id: string;
          title: string;
          description: string;
          priority: string;
          status: string;
          createdAt: Date;
          updatedAt: Date;
          dueDate: Date;
          section_name: string;
          board_name: string;
          assigned_to_name: string;
          created_by_name: string;
        }

        const searchResults = (await db.$queryRaw`
          SELECT 
            t.id,
            t.title,
            t.description,
            t.priority,
            t.status,
            t."createdAt",
            t."updatedAt",
            t."dueDate",
            bs.name as section_name,
            b.name as board_name,
            u.name as assigned_to_name,
            uc.name as created_by_name
          FROM "Task" t
          JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
          JOIN "Board" b ON bs."boardId" = b.id
          JOIN "User" u ON t."assignedToId" = u.id
          JOIN "User" uc ON t."createdById" = uc.id
          WHERE 
            ${params.boardId ? db.$queryRaw`b.id = ${params.boardId} AND` : db.$queryRaw``}
            (
              t.title ILIKE ${queryParam} OR
              t.description ILIKE ${queryParam}
            )
            AND ${session.user.id} = ANY(b.access)
          ORDER BY t."createdAt" DESC
          LIMIT ${params.limit}
        `) as SearchResult[];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  threshold: params.threshold,
                  results: searchResults.map((result) => ({
                    id: result.id,
                    title: result.title,
                    description: result.description,
                    priority: result.priority,
                    status: result.status,
                    dueDate: result.dueDate,
                    boardName: result.board_name,
                    sectionName: result.section_name,
                    assignedTo: result.assigned_to_name,
                    createdBy: result.created_by_name,
                    createdAt: result.createdAt,
                    updatedAt: result.updatedAt,
                    relevanceScore: 0.8, // Placeholder until vector search
                  })),
                  resultCount: searchResults.length,
                  searchType: "text-based", // Will become "vector-based" in Phase 2
                  message:
                    "Search completed (using text-based search until embeddings are implemented)",
                },
                null,
                2
              ),
            },
          ],
        };
      }
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
                ])
              )
              .optional(),
          })
          .optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // Validate company context
        const companyId = session.user.cid;
        if (!companyId) {
          throw new Error("Company context required");
        }

        // Placeholder implementation - will be enhanced in Phase 2 with actual vector search
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = {
          boardSection: {
            board: {
              access: {
                has: session.user.id,
              },
            },
          },
          OR: [
            { title: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
          ],
        };

        if (params.filters?.boardId) {
          whereClause.boardSection.boardId = params.filters.boardId;
        }

        if (params.filters?.priority?.length) {
          whereClause.priority = { in: params.filters.priority };
        }

        if (params.filters?.status?.length) {
          whereClause.status = { in: params.filters.status };
        }

        const results = await db.task.findMany({
          where: whereClause,
          take: params.limit,
          include: {
            assignedTo: true,
            createdBy: true,
            boardSection: {
              include: {
                board: true,
              },
            },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });

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
                  results: results.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.dueDate,
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                    assignedTo: task.assignedTo.name,
                    createdBy: task.createdBy.name,
                    relevanceScore: Math.random() * 0.5 + 0.5, // Placeholder score
                    searchMatch: {
                      titleMatch: task.title
                        .toLowerCase()
                        .includes(params.query.toLowerCase()),
                      descriptionMatch: task.description
                        .toLowerCase()
                        .includes(params.query.toLowerCase()),
                    },
                  })),
                  resultCount: results.length,
                  searchType: "hybrid-placeholder",
                  filters: params.filters,
                  message:
                    "Hybrid search completed (vector component will be implemented in Phase 2)",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Get embedding status tool
    server.tool(
      "get_embedding_status",
      "Check the status of task and board embeddings",
      {
        boardId: z.string().optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

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
                      has: session.user.id,
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
                  has: session.user.id,
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
                            1
                          ) + "%"
                        : "0%",
                  },
                  vectorSearchCapability: {
                    enabled: process.env.PGVECTOR_ENABLED === "true",
                    embeddingModel:
                      process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
                    dimensions: parseInt(
                      process.env.EMBEDDING_DIMENSIONS || "1536"
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
                2
              ),
            },
          ],
        };
      }
    );

    // Search boards tool
    server.tool(
      "search_boards",
      "Search and filter boards accessible to the user",
      {
        query: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: Record<string, any> = {
          access: {
            has: session.user.id,
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
                      0
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
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        vector_search_tasks: {
          description: "Semantic search on task embeddings",
        },
        hybrid_search: { description: "Hybrid vector + keyword search" },
        get_embedding_status: { description: "Check embedding availability" },
        search_boards: { description: "Search accessible boards" },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
    maxDuration: parseInt(process.env.MCP_MAX_DURATION || "800"),
  }
);

export { handler as GET, handler as POST, handler as DELETE };
