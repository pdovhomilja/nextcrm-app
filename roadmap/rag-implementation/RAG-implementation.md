# RAG Implementation for Simfina Intranet Project Manager AI

## Project Overview

Transform the existing Task module into a data source for an intelligent Project Manager AI agent using Retrieval-Augmented Generation (RAG) architecture. This implementation will leverage the current PostgreSQL database, Prisma ORM, Next.js infrastructure, and **Vercel AI SDK** as the primary toolkit for all AI operations including embeddings, chat completions, and tool calling.

## Technology Stack

- **AI Framework**: Vercel AI SDK v4.x (ai package)
- **MCP Integration**: Vercel MCP Adapter (`@vercel/mcp-adapter`)
- **Protocol**: Model Context Protocol (MCP) for standardized tool integration
- **Embedding Provider**: OpenAI via Vercel AI SDK
- **Chat Provider**: OpenAI GPT-4 via Vercel AI SDK
- **Vector Database**: PostgreSQL with pgvector extension
- **Streaming**: Vercel AI SDK's `streamText` and `streamObject`
- **Tool Calling**: MCP servers with Vercel AI SDK's `experimental_createMCPClient`
- **UI Components**: Vercel AI SDK's React hooks (`useChat`, `useCompletion`)
- **Infrastructure**: Redis for MCP SSE transport, Vercel Fluid Compute

## Phase 1: MCP Server Setup & Vector Database Integration

### 1.1 MCP Infrastructure Setup

**Goal**: Set up Model Context Protocol servers using Vercel MCP Adapter

**Tasks**:

- [ ] Install MCP dependencies: `pnpm add @vercel/mcp-adapter redis @modelcontextprotocol/sdk`
- [ ] Create MCP server structure in `/app/api/mcp/[transport]/route.ts`
- [ ] Configure Redis for SSE transport (required for production)
- [ ] Enable Vercel Fluid Compute in project settings
- [ ] Set up environment variables for MCP configuration
- [ ] Create dedicated MCP servers for different functionalities:
  - Task RAG Server (`/app/api/mcp/tasks/[transport]/route.ts`)
  - Vector Search Server (`/app/api/mcp/search/[transport]/route.ts`)
  - Analytics Server (`/app/api/mcp/analytics/[transport]/route.ts`)
  - Board Operations Server (`/app/api/mcp/boards/[transport]/route.ts`)

**MCP Server Architecture**:

```typescript
// /app/api/mcp/tasks/[transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { auth } from "@/auth";
import db from "@/lib/db";

const handler = createMcpHandler(
  async (server) => {
    // Task Management Tools
    server.tool(
      "create_task",
      "Create a new task in the specified board",
      {
        title: z.string(),
        description: z.string().optional(),
        boardId: z.string(),
        sectionId: z.string(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        assigneeIds: z.array(z.string()).optional(),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) throw new Error("Unauthorized");

        const task = await db.task.create({
          data: {
            title: params.title,
            description: params.description,
            boardId: params.boardId,
            sectionId: params.sectionId,
            priority: params.priority,
            companyId: session.user.companyId,
            createdBy: session.user.id,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `Task created successfully: ${task.title} (ID: ${task.id})`,
            },
          ],
        };
      },
    );

    server.tool(
      "search_tasks",
      "Search tasks with filters and semantic search",
      {
        query: z.string().optional(),
        boardId: z.string().optional(),
        status: z
          .array(
            z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
          )
          .optional(),
        priority: z
          .array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]))
          .optional(),
        assigneeIds: z.array(z.string()).optional(),
        limit: z.number().default(10),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) throw new Error("Unauthorized");

        // Implement semantic search + filters
        const tasks = await searchTasks({
          ...params,
          companyId: session.user.companyId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      "analyze_project_health",
      "Analyze project health metrics and bottlenecks",
      {
        boardId: z.string(),
        timeRange: z.enum(["week", "month", "quarter"]).default("month"),
      },
      async (params) => {
        const session = await auth();
        if (!session?.user) throw new Error("Unauthorized");

        const analysis = await analyzeProjectHealth(
          params.boardId,
          params.timeRange,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      },
    );
  },
  {
    capabilities: {
      tools: {
        create_task: { description: "Create a new task" },
        search_tasks: { description: "Search and filter tasks" },
        analyze_project_health: { description: "Analyze project metrics" },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 800, // Pro/Enterprise accounts
  },
);

export { handler as GET, handler as POST, handler as DELETE };
```

### 1.2 Vector Database Integration

**Goal**: Add vector storage capabilities to the existing PostgreSQL setup

**Tasks**:

- [ ] Install and configure pgvector extension for PostgreSQL
- [ ] Create new Prisma models for vector storage:
  - `TaskEmbedding` - stores task content embeddings
  - `BoardEmbedding` - stores board/project context embeddings
  - `ConversationHistory` - stores AI agent interactions
- [ ] Update `schema.prisma` with vector-specific fields
- [ ] Run migrations to add vector tables
- [ ] Test vector similarity search queries

**Technical Details**:

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
```

### 1.2 Data Extraction & Preprocessing

**Goal**: Create ETL pipeline for task data transformation

**Tasks**:

- [ ] Create server action `/actions/ai/extract-task-data.ts`
- [ ] Implement data transformation functions:
  - Task content serialization (title + description + comments)
  - Board context extraction (board name + sections + team members)
  - User activity patterns analysis
  - Priority and status metadata compilation
- [ ] Add data cleaning and normalization utilities
- [ ] Create batch processing for existing task data
- [ ] Implement incremental data updates

**Data Structure**:

```typescript
interface TaskDocument {
  id: string;
  content: string; // Concatenated title, description, comments
  metadata: {
    boardId: string;
    boardName: string;
    sectionName: string;
    priority: TaskPriority;
    status: TaskStatus;
    assigneeIds: string[];
    assigneeNames: string[];
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
    tags: string[];
  };
}
```

## Phase 2: Embedding Generation

### 2.1 Embedding Strategy

**Goal**: Generate and store vector embeddings using Vercel AI SDK

**Tasks**:

- [ ] Install Vercel AI SDK: `pnpm add ai @ai-sdk/openai`
- [ ] Create embedding service `/lib/ai/embedding-service.ts` using Vercel AI SDK
- [ ] Implement embedding generation for:
  - Individual task documents
  - Board/project summaries
  - User activity summaries
  - Historical project patterns
- [ ] Add embedding batch processing capabilities
- [ ] Implement cost optimization (caching, deduplication)

**Service Architecture using Vercel AI SDK**:

```typescript
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

export class EmbeddingService {
  private model = openai.embedding("text-embedding-ada-002");

  async generateTaskEmbedding(taskId: string): Promise<number[]> {
    const taskData = await this.extractTaskData(taskId);
    const { embedding } = await embed({
      model: this.model,
      value: taskData.content,
    });
    return embedding;
  }

  async generateBoardEmbedding(boardId: string): Promise<number[]> {
    const boardData = await this.extractBoardData(boardId);
    const { embedding } = await embed({
      model: this.model,
      value: boardData.content,
    });
    return embedding;
  }

  async batchProcessTasks(companyId: string): Promise<void> {
    const tasks = await this.getTasksForCompany(companyId);
    const contents = tasks.map((task) => task.content);

    const { embeddings } = await embedMany({
      model: this.model,
      values: contents,
    });

    await this.storeEmbeddings(tasks, embeddings);
  }

  async updateTaskEmbedding(taskId: string): Promise<void> {
    const embedding = await this.generateTaskEmbedding(taskId);
    await this.storeTaskEmbedding(taskId, embedding);
  }
}
```

### 2.2 Real-time Updates

**Goal**: Keep embeddings synchronized with task data changes

**Tasks**:

- [ ] Add embedding update triggers to existing server actions:
  - `create-task.ts`
  - `update-task.ts` (new action needed)
  - `delete-task.ts`
  - `update-task-position.ts`
- [ ] Implement async embedding queue system
- [ ] Add error handling and retry logic
- [ ] Create embedding synchronization health checks
- [ ] Add monitoring for embedding freshness

## Phase 3: RAG Implementation

### 3.1 Retrieval System

**Goal**: Build semantic search and context retrieval capabilities

**Tasks**:

- [ ] Create vector similarity search functions
- [ ] Implement hybrid search (vector + keyword) using PostgreSQL full-text search
- [ ] Add context ranking algorithms based on:
  - Semantic similarity scores
  - Recency weighting
  - User permission filtering
  - Project relevance
- [ ] Create retrieval API `/api/ai/retrieve`
- [ ] Add query preprocessing and enhancement
- [ ] Implement result diversification and deduplication

**Search Interface**:

```typescript
interface RetrievalQuery {
  query: string;
  companyId: string;
  userId: string;
  filters?: {
    boardIds?: string[];
    priority?: TaskPriority[];
    status?: TaskStatus[];
    dateRange?: { start: Date; end: Date };
    assigneeIds?: string[];
  };
  limit?: number;
  threshold?: number; // Similarity threshold
}

interface RetrievalResult {
  documents: TaskDocument[];
  scores: number[];
  totalResults: number;
  queryTime: number;
}
```

### 3.2 Context Assembly

**Goal**: Prepare retrieved content for AI agent consumption

**Tasks**:

- [ ] Design prompt templates for different query types:
  - Project status inquiries
  - Task recommendations
  - Progress analysis
  - Resource allocation suggestions
- [ ] Implement context window management (handle token limits)
- [ ] Create relevance scoring for retrieved documents
- [ ] Add conversation history integration
- [ ] Implement context compression techniques

**Prompt Templates**:

```typescript
interface PromptTemplate {
  type: "status" | "recommendation" | "analysis" | "allocation";
  systemPrompt: string;
  contextTemplate: string;
  userQueryTemplate: string;
  maxTokens: number;
}
```

## Phase 4: AI Agent Architecture

### 4.1 MCP-Powered Agent Framework

**Goal**: Build intelligent project management agent using MCP servers and Vercel AI SDK

**Tasks**:

- [ ] Set up MCP client integration with `experimental_createMCPClient`
- [ ] Connect to multiple MCP servers for different capabilities
- [ ] Implement agent roles using MCP tools:
  - **Project Analyzer**: Uses Analytics MCP Server
  - **Task Recommender**: Uses Task RAG MCP Server
  - **Progress Tracker**: Uses Board Operations MCP Server
  - **Resource Optimizer**: Uses Vector Search MCP Server
- [ ] Create agent memory and conversation state management
- [ ] Add dynamic tool loading from MCP servers
- [ ] Implement agent decision-making logic with structured outputs

**MCP Agent Architecture**:

```typescript
// /lib/ai/mcp-agent.ts
import { experimental_createMCPClient } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { openai } from "@ai-sdk/openai";
import { generateText, generateObject } from "ai";

export class MCPProjectManagerAgent {
  private clients: Map<string, any> = new Map();
  private tools: Map<string, any> = new Map();

  async initialize() {
    // Initialize MCP clients for different servers
    const servers = [
      { name: "tasks", url: "/api/mcp/tasks/sse" },
      { name: "search", url: "/api/mcp/search/sse" },
      { name: "analytics", url: "/api/mcp/analytics/sse" },
      { name: "boards", url: "/api/mcp/boards/sse" },
    ];

    for (const server of servers) {
      const transport = new SSEClientTransport(
        new URL(server.url, process.env.NEXT_PUBLIC_APP_URL!),
      );

      const client = await experimental_createMCPClient({ transport });
      const serverTools = await client.tools();

      this.clients.set(server.name, client);

      // Merge tools from all servers
      for (const [toolName, tool] of Object.entries(serverTools)) {
        this.tools.set(`${server.name}_${toolName}`, tool);
      }
    }
  }

  async processQuery(
    query: string,
    context: {
      boardId?: string;
      userId: string;
      companyId: string;
    },
  ) {
    // Get all available tools from MCP servers
    const allTools = Object.fromEntries(this.tools);

    const result = await generateText({
      model: openai("gpt-4-turbo"),
      tools: allTools,
      system: `You are a project management AI assistant with access to the following MCP servers:
        - Task Management: Create, update, search tasks
        - Vector Search: Semantic search across project data
        - Analytics: Project health analysis and insights
        - Board Operations: Board and section management
        
        Use the appropriate tools to help users with project management tasks.
        Always consider the user's context: boardId=${context.boardId}, companyId=${context.companyId}`,
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      maxTokens: 1000,
    });

    return result;
  }

  async generateProjectInsights(boardId: string) {
    const analyticsTools = Array.from(this.tools.entries())
      .filter(([name]) => name.startsWith("analytics_"))
      .reduce((acc, [name, tool]) => ({ ...acc, [name]: tool }), {});

    const result = await generateObject({
      model: openai("gpt-4-turbo"),
      tools: analyticsTools,
      system:
        "Generate comprehensive project insights using available analytics tools.",
      prompt: `Analyze project health for board ${boardId}`,
      schema: z.object({
        overview: z.string(),
        metrics: z.object({
          completionRate: z.number(),
          teamEfficiency: z.number(),
          avgTaskDuration: z.number(),
        }),
        recommendations: z.array(
          z.object({
            type: z.string(),
            description: z.string(),
            priority: z.enum(["low", "medium", "high"]),
          }),
        ),
        bottlenecks: z.array(z.string()),
      }),
    });

    return result.object;
  }

  async close() {
    // Close all MCP clients
    for (const client of this.clients.values()) {
      await client.close();
    }
  }
}
```

**Agent Architecture using Vercel AI SDK**:

```typescript
import { openai } from "@ai-sdk/openai";
import { generateObject, tool } from "ai";
import { z } from "zod";

export class ProjectManagerAgent {
  private model = openai("gpt-4-turbo");

  // Define tools using Vercel AI SDK
  private tools = {
    analyzeProject: tool({
      description: "Analyze project health and identify bottlenecks",
      parameters: z.object({
        boardId: z.string(),
        analysisType: z.enum(["health", "bottlenecks", "trends"]),
      }),
      execute: async ({ boardId, analysisType }) => {
        return await this.performProjectAnalysis(boardId, analysisType);
      },
    }),

    recommendTasks: tool({
      description: "Recommend task priorities and assignments",
      parameters: z.object({
        userId: z.string(),
        boardId: z.string(),
        criteria: z.array(z.enum(["priority", "skill_match", "workload"])),
      }),
      execute: async ({ userId, boardId, criteria }) => {
        return await this.generateTaskRecommendations(
          userId,
          boardId,
          criteria,
        );
      },
    }),

    trackProgress: tool({
      description: "Monitor project progress and milestones",
      parameters: z.object({
        boardId: z.string(),
        timeRange: z.enum(["week", "month", "quarter"]),
      }),
      execute: async ({ boardId, timeRange }) => {
        return await this.trackProjectProgress(boardId, timeRange);
      },
    }),

    optimizeResources: tool({
      description: "Recommend workload balancing and resource optimization",
      parameters: z.object({
        teamIds: z.array(z.string()),
        optimizationType: z.enum(["workload", "skills", "deadlines"]),
      }),
      execute: async ({ teamIds, optimizationType }) => {
        return await this.optimizeTeamResources(teamIds, optimizationType);
      },
    }),
  };

  async processQuery(
    query: string,
    context: RAGContext,
    conversationHistory: AIMessage[],
  ) {
    const retrievedDocs = await this.retrieveRelevantDocs(query, context);

    const result = await generateObject({
      model: this.model,
      tools: this.tools,
      system: this.buildSystemPrompt(context),
      messages: [
        ...conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        {
          role: "user",
          content: this.buildUserPrompt(query, retrievedDocs),
        },
      ],
      schema: z.object({
        response: z.string(),
        confidence: z.number().min(0).max(1),
        suggestions: z.array(
          z.object({
            type: z.enum(["task", "assignment", "priority", "schedule"]),
            action: z.string(),
            reasoning: z.string(),
          }),
        ),
        citations: z.array(z.string()),
      }),
    });

    return result.object;
  }
}
```

### 4.2 Tool Integration

**Goal**: Connect AI agent to existing system capabilities

**Tasks**:

- [ ] Create AI-callable wrappers for existing server actions:
  - Task creation and updates
  - Board management
  - User assignments
  - Status changes
- [ ] Add new server actions for AI-specific operations:
  - Bulk task operations
  - Smart scheduling
  - Workload analysis
  - Performance insights
- [ ] Implement permission-aware tool execution
- [ ] Add audit logging for AI actions

**Tool Interface**:

```typescript
interface AITool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: unknown, context: AIContext) => Promise<unknown>;
  requiredPermissions: UserRole[];
}
```

## Phase 5: API & Interface Layer

### 5.1 MCP-Enhanced RAG API Endpoints

**Goal**: Expose AI capabilities using MCP servers and Vercel AI SDK

**Tasks**:

- [ ] Create `/api/ai/chat` - MCP-powered chat interface using `streamText`
- [ ] Create `/api/ai/suggest` - MCP-based suggestions using `generateObject`
- [ ] Create `/api/ai/analyze` - MCP analytics using `streamObject`
- [ ] Create `/api/ai/embeddings` - Embedding management using `embed`/`embedMany`
- [ ] Implement MCP client pooling and connection management
- [ ] Add API rate limiting and authentication
- [ ] Add request/response logging and monitoring

**MCP Client Integration**:

```typescript
// /lib/ai/mcp-client-pool.ts
import { experimental_createMCPClient } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

class MCPClientPool {
  private static instance: MCPClientPool;
  private clients: Map<string, any> = new Map();
  private tools: Map<string, any> = new Map();

  static getInstance(): MCPClientPool {
    if (!MCPClientPool.instance) {
      MCPClientPool.instance = new MCPClientPool();
    }
    return MCPClientPool.instance;
  }

  async getTools(serverName?: string) {
    if (!this.tools.size) {
      await this.initializeClients();
    }

    if (serverName) {
      return Array.from(this.tools.entries())
        .filter(([name]) => name.startsWith(`${serverName}_`))
        .reduce((acc, [name, tool]) => ({ ...acc, [name]: tool }), {});
    }

    return Object.fromEntries(this.tools);
  }

  private async initializeClients() {
    const servers = [
      { name: "tasks", url: "/api/mcp/tasks/sse" },
      { name: "search", url: "/api/mcp/search/sse" },
      { name: "analytics", url: "/api/mcp/analytics/sse" },
      { name: "boards", url: "/api/mcp/boards/sse" },
    ];

    for (const server of servers) {
      try {
        const transport = new SSEClientTransport(
          new URL(server.url, process.env.NEXT_PUBLIC_APP_URL!),
        );

        const client = await experimental_createMCPClient({ transport });
        const serverTools = await client.tools();

        this.clients.set(server.name, client);

        for (const [toolName, tool] of Object.entries(serverTools)) {
          this.tools.set(`${server.name}_${toolName}`, tool);
        }
      } catch (error) {
        console.error(
          `Failed to initialize MCP client for ${server.name}:`,
          error,
        );
      }
    }
  }
}

export const mcpClientPool = MCPClientPool.getInstance();
```

**MCP-Enhanced API Implementation**:

```typescript
// /app/api/ai/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { auth } from "@/lib/auth/auth";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, boardId, taskId } = await req.json();

  // Get MCP tools from all servers
  const mcpTools = await mcpClientPool.getTools();

  // Retrieve relevant context using RAG
  const context = await retrieveContext(messages[messages.length - 1].content, {
    companyId: session.user.companyId,
    userId: session.user.id,
    boardId,
    taskId,
  });

  const result = await streamText({
    model: openai("gpt-4-turbo"),
    messages: [
      {
        role: "system",
        content: buildSystemPromptWithMCP(context, session.user),
      },
      ...messages,
    ],
    tools: mcpTools, // Use MCP tools instead of static tools
    temperature: 0.7,
    maxTokens: 1000,
  });

  return result.toAIStreamResponse();
}

// /app/api/ai/suggest/route.ts
import { generateObject } from "ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { boardId, suggestionType } = await req.json();

  const context = await gatherBoardContext(boardId);

  const result = await generateObject({
    model: openai("gpt-4-turbo"),
    system:
      "You are a project management assistant that provides actionable suggestions.",
    prompt: `Analyze the project context and provide ${suggestionType} suggestions`,
    schema: z.object({
      suggestions: z.array(
        z.object({
          type: z.enum(["task", "assignment", "priority", "deadline"]),
          title: z.string(),
          description: z.string(),
          reasoning: z.string(),
          confidence: z.number().min(0).max(1),
          impact: z.enum(["low", "medium", "high"]),
        }),
      ),
      summary: z.string(),
    }),
  });

  return Response.json(result.object);
}

// /app/api/ai/analyze/route.ts
import { streamObject } from "ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { boardId, analysisType } = await req.json();

  const result = await streamObject({
    model: openai("gpt-4-turbo"),
    system: "You are a project analyst providing real-time insights.",
    prompt: `Perform ${analysisType} analysis for board ${boardId}`,
    schema: z.object({
      analysis: z.object({
        overview: z.string(),
        insights: z.array(
          z.object({
            category: z.string(),
            finding: z.string(),
            severity: z.enum(["low", "medium", "high", "critical"]),
            recommendation: z.string(),
          }),
        ),
        metrics: z.object({
          completionRate: z.number(),
          averageTaskDuration: z.number(),
          bottlenecks: z.array(z.string()),
          teamEfficiency: z.number(),
        }),
      }),
    }),
  });

  return result.toTextStreamResponse();
}
```

### 5.2 Frontend Integration

**Goal**: Add AI capabilities using Vercel AI SDK React hooks

**Tasks**:

- [ ] Create AI chat component using `useChat` hook
- [ ] Add suggestion widgets using `useCompletion` hook
- [ ] Create project insights panels with `useObject` hook
- [ ] Implement conversation history UI
- [ ] Add AI-powered task creation forms
- [ ] Create progress analysis dashboards with streaming
- [ ] Add smart notification system

**UI Components using Vercel AI SDK**:

```typescript
// AIAssistant - Floating chat interface
'use client';
import { useChat } from 'ai/react';

export function AIAssistant({ boardId }: { boardId?: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: { boardId },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your project management assistant. How can I help you today?',
      },
    ],
  });

  return (
    <div className="flex flex-col h-96 border rounded-lg p-4">
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-2 rounded ${
              message.role === 'user' ? 'bg-blue-100 ml-4' : 'bg-gray-100 mr-4'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about your project..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// SmartSuggestions - Contextual task recommendations
'use client';
import { useCompletion } from 'ai/react';
import { useEffect } from 'react';

export function SmartSuggestions({ boardId }: { boardId: string }) {
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/suggest',
  });

  useEffect(() => {
    complete(`Generate task suggestions for board ${boardId}`);
  }, [boardId]);

  if (isLoading) {
    return <div className="animate-pulse">Generating suggestions...</div>;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-semibold text-yellow-800 mb-2">💡 AI Suggestions</h3>
      <div className="text-sm text-yellow-700">{completion}</div>
    </div>
  );
}

// ProjectInsights - AI-generated project analysis with streaming
'use client';
import { experimental_useObject as useObject } from 'ai/react';
import { z } from 'zod';

const analysisSchema = z.object({
  overview: z.string(),
  insights: z.array(z.object({
    category: z.string(),
    finding: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    recommendation: z.string(),
  })),
  metrics: z.object({
    completionRate: z.number(),
    averageTaskDuration: z.number(),
    bottlenecks: z.array(z.string()),
    teamEfficiency: z.number(),
  }),
});

export function ProjectInsights({ boardId }: { boardId: string }) {
  const { object, submit, isLoading } = useObject({
    api: '/api/ai/analyze',
    schema: analysisSchema,
  });

  const handleAnalyze = () => {
    submit({ boardId, analysisType: 'comprehensive' });
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">📊 Project Analysis</h2>
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Project'}
        </button>
      </div>

      {object?.overview && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Overview</h3>
            <p className="text-gray-700">{object.overview}</p>
          </div>

          {object.metrics && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">Completion Rate</div>
                <div className="text-xl font-bold">{Math.round(object.metrics.completionRate * 100)}%</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600">Team Efficiency</div>
                <div className="text-xl font-bold">{Math.round(object.metrics.teamEfficiency * 100)}%</div>
              </div>
            </div>
          )}

          {object.insights && object.insights.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Key Insights</h3>
              <div className="space-y-2">
                {object.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      insight.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      insight.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      insight.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{insight.category}</div>
                    <div className="text-sm text-gray-700 mb-1">{insight.finding}</div>
                    <div className="text-sm text-gray-600">{insight.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// AITaskForm - Enhanced task creation with AI suggestions
'use client';
import { useCompletion } from 'ai/react';
import { useState } from 'react';

export function AITaskForm({ boardId }: { boardId: string }) {
  const [taskInput, setTaskInput] = useState('');
  const { completion, complete, isLoading } = useCompletion({
    api: '/api/ai/enhance-task',
  });

  const handleEnhance = () => {
    if (taskInput.trim()) {
      complete(`Enhance this task description: ${taskInput}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Task Description</label>
        <textarea
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Describe your task..."
          className="w-full p-2 border rounded-lg"
          rows={3}
        />
      </div>

      <button
        onClick={handleEnhance}
        disabled={isLoading || !taskInput.trim()}
        className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
      >
        ✨ Enhance with AI
      </button>

      {completion && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800 mb-2">AI Enhanced Description</h4>
          <p className="text-purple-700">{completion}</p>
        </div>
      )}
    </div>
  );
}
```

## Phase 6: Advanced Features

### 6.1 Multi-modal Capabilities

**Goal**: Process non-text data sources

**Tasks**:

- [ ] Integrate with existing MinIO file storage
- [ ] Add document processing for task attachments:
  - PDF text extraction
  - Image OCR capabilities
  - Document summarization
- [ ] Implement file content embeddings
- [ ] Add support for meeting notes and recordings
- [ ] Create document-based insights

### 6.2 Personalization & Learning

**Goal**: Adapt AI behavior to user and company patterns

**Tasks**:

- [ ] Implement user preference learning
- [ ] Add custom project management style recognition
- [ ] Create team-specific suggestion models
- [ ] Add feedback loop for AI recommendations
- [ ] Implement A/B testing for AI features
- [ ] Create performance metrics and optimization

## Technical Implementation Details

### Security & Privacy

- [ ] Ensure tenant isolation in all vector queries
- [ ] Implement RBAC for AI features matching existing system
- [ ] Add AI audit logging to existing `ActivityLog` model
- [ ] Handle sensitive data appropriately (exclude from embeddings)
- [ ] Implement data retention policies for AI interactions
- [ ] Add privacy controls for AI data usage

### Performance & Scalability

- [ ] Implement Redis caching for frequent queries
- [ ] Add connection pooling for vector database operations
- [ ] Create embedding generation queues (Bull/BullMQ)
- [ ] Implement query result caching
- [ ] Add performance monitoring and alerting
- [ ] Optimize database indexes for vector operations

### Integration with Existing Codebase

- [ ] Extend existing Prisma models with AI-related fields
- [ ] Follow established TypeScript patterns and conventions
- [ ] Use existing authentication and authorization systems
- [ ] Maintain consistency with current API patterns
- [ ] Leverage existing error handling and validation (Zod schemas)
- [ ] Use established internationalization patterns (next-intl)

### Database Schema Extensions

```prisma
// Add to existing schema.prisma

model AIConversation {
  id        String   @id @default(cuid())
  userId    String
  companyId String
  title     String?
  messages  AIMessage[]
  context   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

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

model AISuggestion {
  id        String   @id @default(cuid())
  userId    String
  companyId String
  type      String   // 'task' | 'assignment' | 'priority' | 'schedule'
  content   Json
  status    String   @default("pending") // 'pending' | 'accepted' | 'rejected'
  confidence Float
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  company Company @relation(fields: [companyId], references: [id])

  @@map("ai_suggestions")
}
```

### Dependencies and Setup

```bash
# Install Vercel AI SDK and MCP packages
pnpm add ai @ai-sdk/openai @vercel/mcp-adapter @modelcontextprotocol/sdk

# Install vector database and Redis support
pnpm add pgvector redis

# Development dependencies
pnpm add -D @types/pg @types/redis
```

### Environment Variables

```env
# AI/RAG Configuration - Vercel AI SDK
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4-turbo
EMBEDDING_MODEL=text-embedding-ada-002
MAX_CONTEXT_TOKENS=8000
EMBEDDING_DIMENSIONS=1536

# MCP Configuration
REDIS_URL=redis://localhost:6379
MCP_SSE_ENABLED=true
MCP_VERBOSE_LOGS=true
MCP_MAX_DURATION=800

# Vector Database
PGVECTOR_ENABLED=true
SIMILARITY_THRESHOLD=0.7

# AI Features
AI_FEATURES_ENABLED=true
AI_SUGGESTIONS_ENABLED=true
AI_ANALYTICS_ENABLED=true
AI_STREAMING_ENABLED=true
MCP_TOOLS_ENABLED=true

# Rate Limiting
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=3600

# MCP Server URLs (for client connections)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
MCP_TASKS_URL=/api/mcp/tasks
MCP_SEARCH_URL=/api/mcp/search
MCP_ANALYTICS_URL=/api/mcp/analytics
MCP_BOARDS_URL=/api/mcp/boards
```

### Vercel AI SDK Configuration

```typescript
// /lib/ai/config.ts
import { openai } from "@ai-sdk/openai";

export const aiConfig = {
  // Chat model for conversations
  chatModel: openai(process.env.AI_MODEL || "gpt-4-turbo"),

  // Embedding model for vector generation
  embeddingModel: openai.embedding(
    process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
  ),

  // Analysis model for structured outputs
  analysisModel: openai("gpt-4-turbo"),

  // Default settings
  defaults: {
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  // Embedding settings
  embedding: {
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
    batchSize: 100, // For batch processing
  },

  // Rate limiting
  rateLimits: {
    requests: parseInt(process.env.AI_RATE_LIMIT_REQUESTS || "100"),
    window: parseInt(process.env.AI_RATE_LIMIT_WINDOW || "3600"), // 1 hour
  },
};
```

## Success Metrics

- [ ] Query response time < 2 seconds
- [ ] Embedding generation time < 5 seconds per task
- [ ] User adoption rate > 70% within 3 months
- [ ] AI suggestion acceptance rate > 40%
- [ ] Reduction in manual project management overhead by 30%
- [ ] Improved task completion rates by 25%

## Rollout Strategy

1. **Phase 1**: MCP server infrastructure setup with Vercel MCP Adapter
2. **Phase 2**: Vector database integration and basic embedding generation
3. **Phase 3**: Individual MCP servers implementation (tasks, search, analytics, boards)
4. **Phase 4**: MCP client pooling and API integration
5. **Phase 5**: Frontend integration with MCP-powered components
6. **Phase 6**: Advanced agent capabilities and tool orchestration
7. **Phase 7**: Performance optimization and production deployment

## MCP-Specific Deployment Considerations

### Vercel Configuration

- **Enable Fluid Compute**: Required for MCP SSE transport
- **Redis Setup**: Essential for production MCP server communication
- **Max Duration**: Set to 800 seconds for Pro/Enterprise accounts
- **Environment Variables**: Configure all MCP-related environment variables

### MCP Server Monitoring

- [ ] Implement MCP server health checks
- [ ] Add MCP tool execution monitoring
- [ ] Track MCP client connection pooling metrics
- [ ] Monitor Redis connection status for SSE transport

### Production Best Practices

- [ ] Implement MCP server load balancing
- [ ] Add circuit breakers for MCP client failures
- [ ] Cache MCP tool responses where appropriate
- [ ] Implement graceful degradation when MCP servers are unavailable

## Risk Mitigation

- [ ] Implement feature flags for gradual MCP rollout
- [ ] Create fallback mechanisms for MCP server failures
- [ ] Add comprehensive error handling for MCP client connections
- [ ] Implement cost monitoring and limits for AI operations
- [ ] Create data backup and recovery procedures
- [ ] Plan for model and MCP protocol updates
- [ ] Add Redis failover mechanisms for SSE transport
- [ ] Implement graceful degradation when MCP tools are unavailable
- [ ] Monitor MCP server performance and scaling requirements

## Additional MCP Resources

### Documentation and Learning

- [Vercel MCP Adapter Documentation](https://vercel.com/docs/mcp)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Vercel MCP for Next.js Template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Example MCP Servers for Inspiration

- [Vercel AI Docs MCP Server](https://github.com/IvanAmador/vercel-ai-docs-mcp)
- [MCP with Vercel Functions](https://vercel.com/templates/ai/model-context-protocol-mcp-with-vercel-functions)
- [Proof of Concept Chat AI with MCP](https://github.com/JamesSloan/VercelGenUI_MCP)

### Benefits of MCP Integration for Simfina

1. **Standardized Tool Interface**: Universal protocol for AI tool integration
2. **Scalable Architecture**: Easy to add new data sources (invoices, VOZ, employees)
3. **Modular Design**: Separate concerns into dedicated MCP servers
4. **Future-Proof**: Industry-standard protocol with growing ecosystem
5. **Vercel Optimized**: Native integration with Vercel infrastructure
6. **Type Safety**: Full TypeScript support with Zod validation
7. **Production Ready**: Redis-backed SSE transport for scale
