# Phase 1: MCP Server Setup & Vector Database Integration

## Overview

This phase establishes the foundation for the RAG implementation by setting up Model Context Protocol (MCP) servers using Vercel MCP Adapter and integrating vector database capabilities with PostgreSQL + pgvector.

## Prerequisites

- Existing Next.js 15.4.4 application with TypeScript
- PostgreSQL database with Prisma ORM
- Vercel deployment environment
- Redis instance for MCP SSE transport

## Implementation Batches

### Batch 1.1: Dependencies & Environment Setup

**Estimated Time**: 1-2 hours
**API Token Usage**: Low

#### Tasks:

- [ ] Install MCP and AI dependencies
- [ ] Configure environment variables
- [ ] Set up Redis for SSE transport
- [ ] Enable Vercel Fluid Compute

#### Dependencies Installation:

```bash
pnpm add @vercel/mcp-adapter redis @modelcontextprotocol/sdk
pnpm add ai @ai-sdk/openai
pnpm add pgvector
pnpm add -D @types/pg @types/redis
```

#### Environment Variables:

```env
# MCP Configuration
REDIS_URL=redis://localhost:6379
MCP_SSE_ENABLED=true
MCP_VERBOSE_LOGS=true
MCP_MAX_DURATION=800

# AI Configuration
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4-turbo
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536

# Feature Flags
AI_FEATURES_ENABLED=true
MCP_TOOLS_ENABLED=true
PGVECTOR_ENABLED=true

# Rate Limiting
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=3600

# MCP Server URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Batch 1.2: PostgreSQL Vector Database Setup

**Estimated Time**: 2-3 hours
**API Token Usage**: Low

#### Tasks:

- [ ] Install pgvector extension
- [ ] Create vector-enabled database schema
- [ ] Update Prisma schema with vector models
- [ ] Run database migrations

#### Database Setup:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Test vector functionality
SELECT '[1,2,3]'::vector;
```

#### Prisma Schema Updates:

```prisma
model TaskEmbedding {
  id        String   @id @default(cuid())
  taskId    String   @unique
  embedding VECTOR(1536)
  content   String   // Original text that was embedded
  metadata  Json     // Additional context (priority, status, etc.)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("task_embeddings")
}

model BoardEmbedding {
  id        String   @id @default(cuid())
  boardId   String   @unique
  embedding VECTOR(1536)
  content   String   // Board name + description + context
  metadata  Json     // Board info, team members, etc.
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)

  @@map("board_embeddings")
}

model AIConversation {
  id        String   @id @default(cuid())
  userId    String
  companyId String
  title     String?
  messages  AIMessage[]
  context   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([companyId])
  @@index([userId])
  @@map("ai_conversations")
}

model AIMessage {
  id             String @id @default(cuid())
  conversationId String
  role           String // 'user' | 'assistant' | 'system'
  content        String
  metadata       Json?
  createdAt      DateTime @default(now())

  conversation AIConversation @relation(fields: [conversationId], references: [id])

  @@map("ai_messages")
}
```

#### Migration Commands:

```bash
npx prisma generate
npx prisma db push
```

### Batch 1.3: Core MCP Server Infrastructure

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Create MCP server base structure
- [ ] Implement Redis-backed SSE transport
- [ ] Set up MCP handler configuration
- [ ] Create health check endpoints

#### Base MCP Server Structure:

Create `/app/api/mcp/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";

const handler = createMcpHandler(
  async (server) => {
    // Base MCP server setup
    server.info({
      name: "TaskHQ Base MCP Server",
      version: "1.0.0",
      description: "Base MCP server for TaskHQ project management",
    });

    // Health check tool
    server.tool(
      "health_check",
      "Check server health and connectivity",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                server: "base-mcp",
              }),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        health_check: { description: "Check server health" },
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
```

### Batch 1.4: Task Management MCP Server

**Estimated Time**: 4-5 hours
**API Token Usage**: Medium-High

#### Tasks:

- [ ] Create dedicated Tasks MCP server
- [ ] Implement task CRUD operations
- [ ] Add task search capabilities
- [ ] Integrate with existing Prisma models

#### Create `/app/api/mcp/tasks/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";

const handler = createMcpHandler(
  async (server) => {
    server.info({
      name: "TaskHQ Tasks MCP Server",
      version: "1.0.0",
      description: "MCP server for task management operations",
    });

    // Create task tool
    server.tool(
      "create_task",
      "Create a new task in the specified board section",
      {
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        boardSectionId: z.string(),
        priority: z
          .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
          .default("MEDIUM"),
        assigneeIds: z.array(z.string()).optional(),
        dueDate: z.string().optional(), // ISO date string
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const task = await db.task.create({
          data: {
            title: params.title,
            description: params.description || "",
            boardSectionId: params.boardSectionId,
            priority: params.priority,
            status: "NEW",
            createdById: session.user.id,
            assignedToId: params.assigneeIds?.[0] || session.user.id,
            dueDate: params.dueDate
              ? new Date(params.dueDate)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            position: 0,
          },
          include: {
            assignedTo: true,
            createdBy: true,
            boardSection: {
              include: {
                board: true,
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
                  task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status: task.status,
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                    assignedTo: task.assignedTo.name,
                    createdBy: task.createdBy.name,
                    createdAt: task.createdAt,
                  },
                  message: `Task "${task.title}" created successfully`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Search tasks tool
    server.tool(
      "search_tasks",
      "Search and filter tasks with semantic and traditional search",
      {
        query: z.string().optional(),
        boardId: z.string().optional(),
        status: z
          .array(
            z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
          )
          .optional(),
        priority: z
          .array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
          .optional(),
        assigneeIds: z.array(z.string()).optional(),
        limit: z.number().min(1).max(50).default(10),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const whereClause: any = {
          boardSection: {
            board: {
              access: {
                has: session.user.id,
              },
            },
          },
        };

        if (params.boardId) {
          whereClause.boardSection.boardId = params.boardId;
        }

        if (params.status?.length) {
          whereClause.status = { in: params.status };
        }

        if (params.priority?.length) {
          whereClause.priority = { in: params.priority };
        }

        if (params.assigneeIds?.length) {
          whereClause.assignedToId = { in: params.assigneeIds };
        }

        if (params.query) {
          whereClause.OR = [
            { title: { contains: params.query, mode: "insensitive" } },
            { description: { contains: params.query, mode: "insensitive" } },
          ];
        }

        const tasks = await db.task.findMany({
          where: whereClause,
          take: params.limit,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          include: {
            assignedTo: true,
            createdBy: true,
            boardSection: {
              include: {
                board: true,
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
                  results: tasks.map((task) => ({
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
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                  })),
                  totalResults: tasks.length,
                  query: params.query,
                  filters: {
                    boardId: params.boardId,
                    status: params.status,
                    priority: params.priority,
                    assigneeIds: params.assigneeIds,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Update task tool
    server.tool(
      "update_task",
      "Update an existing task",
      {
        taskId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        status: z
          .enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"])
          .optional(),
        assignedToId: z.string().optional(),
        dueDate: z.string().optional(), // ISO date string
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        const updateData: any = {};
        if (params.title) updateData.title = params.title;
        if (params.description !== undefined)
          updateData.description = params.description;
        if (params.priority) updateData.priority = params.priority;
        if (params.status) updateData.status = params.status;
        if (params.assignedToId) updateData.assignedToId = params.assignedToId;
        if (params.dueDate) updateData.dueDate = new Date(params.dueDate);

        const task = await db.task.update({
          where: { id: params.taskId },
          data: updateData,
          include: {
            assignedTo: true,
            createdBy: true,
            boardSection: {
              include: {
                board: true,
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
                  task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.dueDate,
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                    assignedTo: task.assignedTo.name,
                    updatedAt: task.updatedAt,
                  },
                  message: `Task "${task.title}" updated successfully`,
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
        create_task: { description: "Create a new task" },
        search_tasks: { description: "Search and filter tasks" },
        update_task: { description: "Update an existing task" },
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
```

### Batch 1.5: Vector Search MCP Server

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:

- [ ] Create Vector Search MCP server
- [ ] Implement similarity search functions
- [ ] Add hybrid search capabilities
- [ ] Create vector management tools

#### Create `/app/api/mcp/search/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";

const handler = createMcpHandler(
  async (server) => {
    server.info({
      name: "TaskHQ Vector Search MCP Server",
      version: "1.0.0",
      description: "MCP server for vector-based semantic search",
    });

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

        // For now, implement basic text search until embeddings are generated
        // This will be replaced with actual vector similarity search in Phase 2
        const searchResults = await db.$queryRaw`
          SELECT 
            t.id,
            t.title,
            t.description,
            t.priority,
            t.status,
            t."createdAt",
            t."updatedAt",
            bs.name as section_name,
            b.name as board_name,
            u.name as assigned_to_name
          FROM "Task" t
          JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
          JOIN "Board" b ON bs."boardId" = b.id
          JOIN "User" u ON t."assignedToId" = u.id
          WHERE 
            ${params.boardId ? `b.id = ${params.boardId} AND` : ""}
            (
              t.title ILIKE ${"%" + params.query + "%"} OR
              t.description ILIKE ${"%" + params.query + "%"}
            )
            AND b.access @> ARRAY[${session.user.id}]::text[]
          ORDER BY t."createdAt" DESC
          LIMIT ${params.limit}
        `;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  query: params.query,
                  threshold: params.threshold,
                  results: searchResults,
                  resultCount: (searchResults as any[]).length,
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

        // Placeholder implementation - will be enhanced in Phase 2 with actual vector search
        const whereClause: any = {
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
                    boardName: task.boardSection.board.name,
                    sectionName: task.boardSection.name,
                    assignedTo: task.assignedTo.name,
                    relevanceScore: Math.random() * 0.5 + 0.5, // Placeholder score
                  })),
                  resultCount: results.length,
                  searchType: "hybrid-placeholder",
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
                },
              },
            },
          });
        }

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
                  },
                  status:
                    taskEmbeddingCount > 0
                      ? "embeddings-available"
                      : "embeddings-pending",
                  message:
                    taskEmbeddingCount > 0
                      ? "Embeddings are available for semantic search"
                      : "No embeddings found. Run embedding generation first.",
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
```

## Testing & Validation

### Batch 1.6: Testing Infrastructure

**Estimated Time**: 2-3 hours
**API Token Usage**: Low-Medium

#### Tasks:

- [ ] Create MCP server health check endpoints
- [ ] Test Redis connection and SSE transport
- [ ] Validate database migrations
- [ ] Test basic MCP tool execution

#### Health Check Implementation:

Create `/app/api/health/mcp/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const healthChecks = {
    database: false,
    redis: false,
    mcpServers: {},
  };

  try {
    // Test database connection
    const { default: db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    healthChecks.database = true;
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  try {
    // Test Redis connection
    const redis = await import("redis").then((r) =>
      r.createClient({
        url: process.env.REDIS_URL,
      })
    );
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    healthChecks.redis = true;
  } catch (error) {
    console.error("Redis health check failed:", error);
  }

  // Test MCP servers
  const mcpEndpoints = [
    { name: "tasks", url: "/api/mcp/tasks/sse" },
    { name: "search", url: "/api/mcp/search/sse" },
  ];

  for (const endpoint of mcpEndpoints) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}${endpoint.url}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          }),
        }
      );
      healthChecks.mcpServers[endpoint.name] = response.ok;
    } catch (error) {
      console.error(`MCP server ${endpoint.name} health check failed:`, error);
      healthChecks.mcpServers[endpoint.name] = false;
    }
  }

  const allHealthy =
    healthChecks.database &&
    healthChecks.redis &&
    Object.values(healthChecks.mcpServers).every(Boolean);

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks: healthChecks,
    },
    {
      status: allHealthy ? 200 : 503,
    }
  );
}
```

## Success Criteria

- [ ] All MCP servers respond to health checks
- [ ] Redis SSE transport is functional
- [ ] Database migrations complete successfully
- [ ] pgvector extension is operational
- [ ] Basic task CRUD operations work through MCP tools
- [ ] Vector search returns results (even with placeholder implementation)

## Next Steps

After completing Phase 1:

1. Proceed to Phase 2: Embedding Generation
2. Set up monitoring for MCP server performance
3. Configure Vercel deployment with proper environment variables
4. Begin user acceptance testing with basic MCP functionality

## Troubleshooting

### Common Issues:

- **Redis connection failures**: Check REDIS_URL and network connectivity
- **pgvector installation**: Ensure PostgreSQL version supports pgvector
- **MCP tool errors**: Verify authentication and database permissions
- **Vercel deployment issues**: Confirm Fluid Compute is enabled

### Debug Commands:

```bash
# Test database connection
npx prisma studio

# Test Redis connection
redis-cli -u $REDIS_URL ping

# Test MCP server locally
curl -X POST http://localhost:3000/api/health/mcp
```
