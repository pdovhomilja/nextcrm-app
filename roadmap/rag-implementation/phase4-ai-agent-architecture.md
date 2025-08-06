# Phase 4: AI Agent Architecture

## Overview
This phase creates the intelligent AI agent system that leverages MCP servers and RAG capabilities to provide sophisticated project management assistance. The agent will have specialized roles, decision-making capabilities, and tool orchestration.

## Prerequisites
- Completed Phase 1: MCP Server Setup & Vector Database Integration
- Completed Phase 2: Embedding Generation
- Completed Phase 3: RAG Implementation
- Operational MCP servers and vector search
- Working RAG processing pipeline

## Implementation Batches

### Batch 4.1: MCP Client Pool & Connection Management

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create MCP client connection pool
- [ ] Implement connection health monitoring
- [ ] Add tool discovery and caching
- [ ] Create connection failover mechanisms

#### MCP Client Pool Implementation:
Create `/lib/ai/mcp-client-pool.ts`:

```typescript
import { experimental_createMCPClient } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPServer {
  name: string;
  url: string;
  description: string;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck: Date;
  tools: Record<string, any>;
}

export interface MCPConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  connectionTimeout: number;
}

export class MCPClientPool {
  private static instance: MCPClientPool;
  private clients: Map<string, any> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private tools: Map<string, any> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  private config: MCPConnectionConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    healthCheckInterval: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
  };

  static getInstance(): MCPClientPool {
    if (!MCPClientPool.instance) {
      MCPClientPool.instance = new MCPClientPool();
    }
    return MCPClientPool.instance;
  }

  /**
   * Initialize all MCP server connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("MCP Client Pool already initialized");
      return;
    }

    console.log("Initializing MCP Client Pool...");

    const serverConfigs = [
      {
        name: "tasks",
        url: "/api/mcp/tasks/sse",
        description: "Task management operations",
      },
      {
        name: "search",
        url: "/api/mcp/search/sse",
        description: "Vector and semantic search",
      },
      {
        name: "analytics",
        url: "/api/mcp/analytics/sse",
        description: "Project analytics and insights",
      },
      {
        name: "boards",
        url: "/api/mcp/boards/sse",
        description: "Board and section management",
      },
    ];

    // Initialize server configs
    for (const config of serverConfigs) {
      this.servers.set(config.name, {
        ...config,
        healthStatus: "unknown",
        lastHealthCheck: new Date(),
        tools: {},
      });
    }

    // Connect to all servers
    await this.connectToAllServers();

    // Start health monitoring
    this.startHealthMonitoring();

    this.isInitialized = true;
    console.log("MCP Client Pool initialized successfully");
  }

  /**
   * Connect to all configured MCP servers
   */
  private async connectToAllServers(): Promise<void> {
    const connectionPromises = Array.from(this.servers.keys()).map(serverName =>
      this.connectToServer(serverName)
    );

    const results = await Promise.allSettled(connectionPromises);

    results.forEach((result, index) => {
      const serverName = Array.from(this.servers.keys())[index];
      if (result.status === "rejected") {
        console.error(`Failed to connect to MCP server ${serverName}:`, result.reason);
        this.updateServerHealth(serverName, "unhealthy");
      }
    });
  }

  /**
   * Connect to a specific MCP server with retry logic
   */
  private async connectToServer(serverName: string, attempt = 1): Promise<boolean> {
    const server = this.servers.get(serverName);
    if (!server) {
      console.error(`Server configuration not found: ${serverName}`);
      return false;
    }

    try {
      console.log(`Connecting to MCP server: ${serverName} (attempt ${attempt})`);

      const transport = new SSEClientTransport(
        new URL(server.url, process.env.NEXT_PUBLIC_APP_URL!)
      );

      // Set connection timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), this.config.connectionTimeout);
      });

      const clientPromise = experimental_createMCPClient({ transport });
      const client = await Promise.race([clientPromise, timeoutPromise]) as any;

      // Get available tools
      const tools = await client.tools();
      
      // Store client and tools
      this.clients.set(serverName, client);
      server.tools = tools;
      
      // Register tools with prefixed names
      Object.entries(tools).forEach(([toolName, tool]) => {
        this.tools.set(`${serverName}_${toolName}`, tool);
      });

      this.updateServerHealth(serverName, "healthy");
      console.log(`Successfully connected to MCP server: ${serverName}`);
      
      return true;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed for ${serverName}:`, error);

      if (attempt < this.config.maxRetries) {
        console.log(`Retrying connection to ${serverName} in ${this.config.retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.connectToServer(serverName, attempt + 1);
      }

      this.updateServerHealth(serverName, "unhealthy");
      return false;
    }
  }

  /**
   * Update server health status
   */
  private updateServerHealth(serverName: string, status: "healthy" | "unhealthy"): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.healthStatus = status;
      server.lastHealthCheck = new Date();
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.servers.keys()).map(serverName =>
      this.checkServerHealth(serverName)
    );

    await Promise.allSettled(healthPromises);
  }

  /**
   * Check health of a specific server
   */
  private async checkServerHealth(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    if (!client) {
      this.updateServerHealth(serverName, "unhealthy");
      return false;
    }

    try {
      // Try to call a health check tool or list tools
      await Promise.race([
        client.tools(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Health check timeout")), 5000)
        ),
      ]);

      this.updateServerHealth(serverName, "healthy");
      return true;
    } catch (error) {
      console.error(`Health check failed for ${serverName}:`, error);
      this.updateServerHealth(serverName, "unhealthy");

      // Attempt to reconnect unhealthy servers
      await this.connectToServer(serverName);
      return false;
    }
  }

  /**
   * Get all available tools from all servers
   */
  async getTools(serverName?: string): Promise<Record<string, any>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (serverName) {
      const server = this.servers.get(serverName);
      if (server && server.healthStatus === "healthy") {
        return Object.fromEntries(
          Array.from(this.tools.entries())
            .filter(([name]) => name.startsWith(`${serverName}_`))
        );
      }
      return {};
    }

    // Return tools only from healthy servers
    const healthyTools: Record<string, any> = {};
    
    for (const [toolName, tool] of this.tools.entries()) {
      const serverName = toolName.split("_")[0];
      const server = this.servers.get(serverName);
      
      if (server?.healthStatus === "healthy") {
        healthyTools[toolName] = tool;
      }
    }

    return healthyTools;
  }

  /**
   * Get specific MCP client
   */
  getClient(serverName: string): any | null {
    const server = this.servers.get(serverName);
    if (server?.healthStatus === "healthy") {
      return this.clients.get(serverName) || null;
    }
    return null;
  }

  /**
   * Get server status information
   */
  getServerStatus(): Array<{
    name: string;
    status: string;
    description: string;
    toolCount: number;
    lastHealthCheck: Date;
  }> {
    return Array.from(this.servers.values()).map(server => ({
      name: server.name,
      status: server.healthStatus,
      description: server.description,
      toolCount: Object.keys(server.tools).length,
      lastHealthCheck: server.lastHealthCheck,
    }));
  }

  /**
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    console.log("Closing MCP Client Pool...");

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const closePromises = Array.from(this.clients.values()).map(client => {
      try {
        return client.close?.();
      } catch (error) {
        console.error("Error closing MCP client:", error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(closePromises);

    this.clients.clear();
    this.tools.clear();
    this.isInitialized = false;

    console.log("MCP Client Pool closed");
  }

  /**
   * Force reconnection to a specific server
   */
  async reconnectServer(serverName: string): Promise<boolean> {
    console.log(`Force reconnecting to server: ${serverName}`);

    // Close existing connection if any
    const existingClient = this.clients.get(serverName);
    if (existingClient) {
      try {
        await existingClient.close();
      } catch (error) {
        console.error(`Error closing existing connection to ${serverName}:`, error);
      }
      this.clients.delete(serverName);
    }

    // Remove old tools
    const toolsToRemove = Array.from(this.tools.keys())
      .filter(toolName => toolName.startsWith(`${serverName}_`));
    
    toolsToRemove.forEach(toolName => this.tools.delete(toolName));

    // Reconnect
    return await this.connectToServer(serverName);
  }
}

export const mcpClientPool = MCPClientPool.getInstance();
```

### Batch 4.2: AI Agent Core Architecture

**Estimated Time**: 4-5 hours
**API Token Usage**: Medium-High

#### Tasks:
- [ ] Create base AI agent class
- [ ] Implement agent decision-making system
- [ ] Add conversation memory management
- [ ] Create agent role specialization

#### Core AI Agent Implementation:
Create `/lib/ai/agent-core.ts`:

```typescript
import { generateText, generateObject } from "ai";
import { aiConfig } from "./config";
import { mcpClientPool } from "./mcp-client-pool";
import { ragProcessor, RAGQuery } from "./rag-processor";
import { z } from "zod";

export interface AgentContext {
  userId: string;
  companyId: string;
  boardId?: string;
  taskId?: string;
  conversationId?: string;
  sessionData?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: Array<{
      toolName: string;
      parameters: any;
      result: any;
    }>;
    ragContext?: string;
    confidence?: number;
  };
}

export interface AgentDecision {
  action: "respond" | "use_tools" | "request_clarification" | "escalate";
  reasoning: string;
  confidence: number;
  toolsToUse?: string[];
  responseStrategy: "direct" | "rag_enhanced" | "tool_orchestrated" | "analytical";
}

export abstract class BaseAIAgent {
  protected agentId: string;
  protected role: string;
  protected capabilities: string[];
  protected conversationHistory: Map<string, AgentMessage[]> = new Map();
  protected mcpTools: Record<string, any> = {};

  constructor(agentId: string, role: string, capabilities: string[]) {
    this.agentId = agentId;
    this.role = role;
    this.capabilities = capabilities;
  }

  /**
   * Initialize agent with MCP tools
   */
  async initialize(): Promise<void> {
    console.log(`Initializing ${this.role} agent...`);
    
    try {
      await mcpClientPool.initialize();
      this.mcpTools = await mcpClientPool.getTools();
      console.log(`${this.role} agent initialized with ${Object.keys(this.mcpTools).length} tools`);
    } catch (error) {
      console.error(`Failed to initialize ${this.role} agent:`, error);
      throw error;
    }
  }

  /**
   * Process user query and generate response
   */
  async processQuery(
    query: string,
    context: AgentContext,
    conversationHistory: AgentMessage[] = []
  ): Promise<{
    response: string;
    decision: AgentDecision;
    toolResults?: any[];
    metadata: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Make decision about how to handle the query
      const decision = await this.makeDecision(query, context, conversationHistory);

      let response: string;
      let toolResults: any[] = [];
      const metadata: Record<string, any> = {
        processingTime: 0,
        strategy: decision.responseStrategy,
        confidence: decision.confidence,
        agentRole: this.role,
      };

      // Step 2: Execute decision
      switch (decision.action) {
        case "use_tools":
          const toolResult = await this.orchestrateTools(
            query,
            context,
            decision.toolsToUse || []
          );
          toolResults = toolResult.results;
          response = await this.synthesizeToolResponse(query, toolResult, context);
          break;

        case "respond":
          if (decision.responseStrategy === "rag_enhanced") {
            const ragResult = await this.processWithRAG(query, context);
            response = ragResult.response;
            metadata.ragContext = ragResult.contextSummary;
            metadata.sources = ragResult.sources;
          } else {
            response = await this.generateDirectResponse(query, context, conversationHistory);
          }
          break;

        case "request_clarification":
          response = await this.generateClarificationRequest(query, context);
          break;

        case "escalate":
          response = "This query requires human assistance. I've flagged it for escalation to your team lead.";
          break;

        default:
          response = "I need to think about how to best help you with this request.";
      }

      // Step 3: Update conversation history
      this.updateConversationHistory(context.conversationId, {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
        metadata: {
          toolCalls: decision.toolsToUse?.map(tool => ({ toolName: tool, parameters: {}, result: {} })),
          confidence: decision.confidence,
        },
      });

      metadata.processingTime = Date.now() - startTime;

      return {
        response,
        decision,
        toolResults,
        metadata,
      };
    } catch (error) {
      console.error(`${this.role} agent processing error:`, error);
      
      return {
        response: "I encountered an error while processing your request. Please try again or rephrase your question.",
        decision: {
          action: "respond",
          reasoning: "Error occurred during processing",
          confidence: 0,
          responseStrategy: "direct",
        },
        metadata: {
          error: error.message,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Make decision about how to handle the query
   */
  protected async makeDecision(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ): Promise<AgentDecision> {
    const decisionPrompt = `As a ${this.role} agent, analyze this query and decide the best approach.

Query: "${query}"
Available capabilities: ${this.capabilities.join(", ")}
Available MCP tools: ${Object.keys(this.mcpTools).slice(0, 10).join(", ")}${Object.keys(this.mcpTools).length > 10 ? "..." : ""}

Conversation context: ${history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n")}

Choose the best action and strategy for handling this query.`;

    try {
      const result = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a decision-making system for an AI project management agent.
        
Your role is to analyze queries and choose the optimal response strategy:
- respond: Direct response using knowledge or RAG
- use_tools: Use MCP tools to gather information or perform actions  
- request_clarification: Ask for more specific information
- escalate: Human assistance needed

Response strategies:
- direct: Simple knowledge-based response
- rag_enhanced: Use retrieved context from documents
- tool_orchestrated: Coordinate multiple tools
- analytical: Deep analysis with structured insights`,
        prompt: decisionPrompt,
        schema: z.object({
          action: z.enum(["respond", "use_tools", "request_clarification", "escalate"]),
          reasoning: z.string(),
          confidence: z.number().min(0).max(1),
          toolsToUse: z.array(z.string()).optional(),
          responseStrategy: z.enum(["direct", "rag_enhanced", "tool_orchestrated", "analytical"]),
        }),
        temperature: 0.3,
      });

      return result.object;
    } catch (error) {
      console.error("Decision making error:", error);
      
      // Fallback decision
      return {
        action: "respond",
        reasoning: "Fallback due to decision error",
        confidence: 0.5,
        responseStrategy: "direct",
      };
    }
  }

  /**
   * Orchestrate multiple MCP tools to fulfill the query
   */
  protected async orchestrateTools(
    query: string,
    context: AgentContext,
    toolNames: string[]
  ): Promise<{ results: any[]; summary: string }> {
    console.log(`Orchestrating tools: ${toolNames.join(", ")}`);

    const results: any[] = [];

    for (const toolName of toolNames) {
      try {
        const tool = this.mcpTools[toolName];
        if (!tool) {
          console.warn(`Tool not available: ${toolName}`);
          continue;
        }

        // This would need to be implemented based on the specific MCP SDK
        // For now, we'll simulate tool execution
        const result = await this.executeTool(toolName, query, context);
        results.push({
          toolName,
          result,
          success: true,
        });
      } catch (error) {
        console.error(`Tool execution failed: ${toolName}`, error);
        results.push({
          toolName,
          error: error.message,
          success: false,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const summary = `Executed ${toolNames.length} tools, ${successCount} succeeded`;

    return { results, summary };
  }

  /**
   * Execute a specific MCP tool (placeholder implementation)
   */
  protected async executeTool(toolName: string, query: string, context: AgentContext): Promise<any> {
    // This would be implemented based on the specific MCP tool interface
    // For now, return a placeholder
    return {
      toolName,
      executed: true,
      timestamp: new Date(),
      context: context,
      query: query.substring(0, 100), // Truncated for brevity
    };
  }

  /**
   * Process query using RAG system
   */
  protected async processWithRAG(query: string, context: AgentContext) {
    const ragQuery: RAGQuery = {
      query,
      companyId: context.companyId,
      userId: context.userId,
      boardId: context.boardId,
      taskId: context.taskId,
      contextType: this.determineContextType(query),
    };

    return await ragProcessor.processQuery(ragQuery);
  }

  /**
   * Determine RAG context type based on query
   */
  protected determineContextType(query: string): "general" | "task_specific" | "board_analysis" | "recommendation" {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes("recommend") || queryLower.includes("suggest") || queryLower.includes("should")) {
      return "recommendation";
    }
    
    if (queryLower.includes("analyze") || queryLower.includes("performance") || queryLower.includes("metrics")) {
      return "board_analysis";
    }
    
    if (queryLower.includes("task") && (queryLower.includes("this") || queryLower.includes("current"))) {
      return "task_specific";
    }
    
    return "general";
  }

  /**
   * Generate direct response without RAG or tools
   */
  protected async generateDirectResponse(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ): Promise<string> {
    const response = await generateText({
      model: aiConfig.chatModel,
      system: `You are a ${this.role} assistant specialized in project management.
      
Your capabilities include: ${this.capabilities.join(", ")}
      
Provide helpful, accurate responses based on your knowledge of project management best practices.`,
      messages: [
        ...history.slice(-5).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.7,
      maxTokens: 500,
    });

    return response.text;
  }

  /**
   * Synthesize response from tool results
   */
  protected async synthesizeToolResponse(
    query: string,
    toolResult: { results: any[]; summary: string },
    context: AgentContext
  ): Promise<string> {
    const synthesisPrompt = `Based on the tool execution results, provide a comprehensive response to the user's query.

Original query: "${query}"
Tool execution summary: ${toolResult.summary}

Tool results:
${JSON.stringify(toolResult.results, null, 2)}

Synthesize this information into a clear, helpful response for the user.`;

    const response = await generateText({
      model: aiConfig.chatModel,
      system: `You are a ${this.role} assistant that synthesizes information from various tools to provide comprehensive responses.`,
      prompt: synthesisPrompt,
      temperature: 0.6,
      maxTokens: 800,
    });

    return response.text;
  }

  /**
   * Generate clarification request
   */
  protected async generateClarificationRequest(
    query: string,
    context: AgentContext
  ): Promise<string> {
    const clarificationPrompt = `The user asked: "${query}"

This query needs clarification to provide the best help. Generate a helpful clarification request that asks for specific details needed to assist them effectively.`;

    const response = await generateText({
      model: aiConfig.chatModel,
      system: "You are helpful at asking clarifying questions to better understand user needs.",
      prompt: clarificationPrompt,
      temperature: 0.6,
      maxTokens: 200,
    });

    return response.text;
  }

  /**
   * Update conversation history
   */
  protected updateConversationHistory(conversationId: string | undefined, message: AgentMessage): void {
    if (!conversationId) return;

    const history = this.conversationHistory.get(conversationId) || [];
    history.push(message);

    // Keep only last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationHistory.set(conversationId, history);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId: string): AgentMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  /**
   * Get agent status
   */
  getStatus(): {
    agentId: string;
    role: string;
    isInitialized: boolean;
    toolCount: number;
    activeConversations: number;
  } {
    return {
      agentId: this.agentId,
      role: this.role,
      isInitialized: Object.keys(this.mcpTools).length > 0,
      toolCount: Object.keys(this.mcpTools).length,
      activeConversations: this.conversationHistory.size,
    };
  }
}
```

### Batch 4.3: Specialized Agent Implementations

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create Project Analyzer Agent
- [ ] Implement Task Recommender Agent
- [ ] Add Progress Tracker Agent
- [ ] Create Resource Optimizer Agent

#### Specialized Agents Implementation:
Create `/lib/ai/specialized-agents.ts`:

```typescript
import { BaseAIAgent, AgentContext, AgentMessage } from "./agent-core";
import { generateObject } from "ai";
import { aiConfig } from "./config";
import { z } from "zod";

/**
 * Project Analyzer Agent - Specializes in project health analysis
 */
export class ProjectAnalyzerAgent extends BaseAIAgent {
  constructor() {
    super("project-analyzer", "Project Analyzer", [
      "project_health_analysis",
      "bottleneck_identification", 
      "performance_metrics",
      "trend_analysis",
      "risk_assessment",
    ]);
  }

  /**
   * Perform comprehensive project analysis
   */
  async analyzeProjectHealth(boardId: string, context: AgentContext): Promise<{
    healthScore: number;
    insights: Array<{
      category: string;
      finding: string;
      severity: "low" | "medium" | "high" | "critical";
      recommendation: string;
    }>;
    metrics: {
      completionRate: number;
      avgTaskDuration: number;
      teamEfficiency: number;
      bottlenecks: string[];
    };
  }> {
    try {
      // Use MCP analytics tools to gather data
      const analyticsResult = await this.orchestrateTools(
        `Analyze project health for board ${boardId}`,
        { ...context, boardId },
        ["analytics_analyze_project_health", "search_semantic_search_tasks"]
      );

      // Generate structured analysis
      const analysisResult = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a project health analysis expert. Analyze the provided data and generate comprehensive insights.`,
        prompt: `Analyze this project data and provide health assessment:
        
Tool results: ${JSON.stringify(analyticsResult.results, null, 2)}

Provide detailed analysis with actionable insights.`,
        schema: z.object({
          healthScore: z.number().min(0).max(100),
          insights: z.array(
            z.object({
              category: z.string(),
              finding: z.string(),
              severity: z.enum(["low", "medium", "high", "critical"]),
              recommendation: z.string(),
            })
          ),
          metrics: z.object({
            completionRate: z.number().min(0).max(1),
            avgTaskDuration: z.number(),
            teamEfficiency: z.number().min(0).max(1),
            bottlenecks: z.array(z.string()),
          }),
        }),
        temperature: 0.4,
      });

      return analysisResult.object;
    } catch (error) {
      console.error("Project analysis error:", error);
      throw error;
    }
  }

  /**
   * Override decision making for project analysis queries
   */
  protected async makeDecision(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ) {
    const queryLower = query.toLowerCase();
    
    // Always use tools for analysis queries
    if (queryLower.includes("analyze") || queryLower.includes("health") || queryLower.includes("performance")) {
      return {
        action: "use_tools" as const,
        reasoning: "Project analysis requires data gathering from analytics tools",
        confidence: 0.9,
        toolsToUse: ["analytics_analyze_project_health", "search_semantic_search_tasks"],
        responseStrategy: "analytical" as const,
      };
    }

    return super.makeDecision(query, context, history);
  }
}

/**
 * Task Recommender Agent - Specializes in task prioritization and recommendations
 */
export class TaskRecommenderAgent extends BaseAIAgent {
  constructor() {
    super("task-recommender", "Task Recommender", [
      "task_prioritization",
      "assignment_optimization",
      "workload_balancing",
      "skill_matching",
      "deadline_optimization",
    ]);
  }

  /**
   * Generate task recommendations
   */
  async generateTaskRecommendations(
    userId: string,
    context: AgentContext,
    criteria: string[] = ["priority", "skill_match", "workload"]
  ): Promise<{
    recommendations: Array<{
      type: "create_task" | "reassign_task" | "adjust_priority" | "extend_deadline";
      taskId?: string;
      title: string;
      description: string;
      reasoning: string;
      confidence: number;
      estimatedImpact: "low" | "medium" | "high";
    }>;
    workloadAnalysis: {
      currentCapacity: number;
      recommendedTasks: number;
      balanceScore: number;
    };
  }> {
    try {
      // Get user's current tasks and workload
      const userTasksResult = await this.orchestrateTools(
        `Get current tasks and workload for user ${userId}`,
        { ...context, taskId: userId },
        ["tasks_search_tasks", "search_find_similar_tasks"]
      );

      // Generate recommendations
      const recommendationResult = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a task recommendation expert. Analyze user workload and project needs to suggest optimal task assignments and priorities.`,
        prompt: `Based on this user's current workload, generate task recommendations:

User data: ${JSON.stringify(userTasksResult.results, null, 2)}
Criteria: ${criteria.join(", ")}

Generate specific, actionable recommendations for task management.`,
        schema: z.object({
          recommendations: z.array(
            z.object({
              type: z.enum(["create_task", "reassign_task", "adjust_priority", "extend_deadline"]),
              taskId: z.string().optional(),
              title: z.string(),
              description: z.string(),
              reasoning: z.string(),
              confidence: z.number().min(0).max(1),
              estimatedImpact: z.enum(["low", "medium", "high"]),
            })
          ).max(5),
          workloadAnalysis: z.object({
            currentCapacity: z.number().min(0).max(1),
            recommendedTasks: z.number(),
            balanceScore: z.number().min(0).max(1),
          }),
        }),
        temperature: 0.5,
      });

      return recommendationResult.object;
    } catch (error) {
      console.error("Task recommendation error:", error);
      throw error;
    }
  }

  /**
   * Override decision making for recommendation queries
   */
  protected async makeDecision(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes("recommend") || queryLower.includes("suggest") || queryLower.includes("should")) {
      return {
        action: "use_tools" as const,
        reasoning: "Recommendations require analysis of current tasks and workload",
        confidence: 0.85,
        toolsToUse: ["tasks_search_tasks", "search_find_similar_tasks"],
        responseStrategy: "tool_orchestrated" as const,
      };
    }

    return super.makeDecision(query, context, history);
  }
}

/**
 * Progress Tracker Agent - Specializes in monitoring project progress
 */
export class ProgressTrackerAgent extends BaseAIAgent {
  constructor() {
    super("progress-tracker", "Progress Tracker", [
      "milestone_tracking",
      "deadline_monitoring", 
      "velocity_calculation",
      "burndown_analysis",
      "completion_forecasting",
    ]);
  }

  /**
   * Track project progress
   */
  async trackProjectProgress(
    boardId: string,
    timeRange: "week" | "month" | "quarter",
    context: AgentContext
  ): Promise<{
    progressSummary: {
      completedTasks: number;
      totalTasks: number;
      completionRate: number;
      onTrackMilestones: number;
      delayedMilestones: number;
    };
    trends: Array<{
      metric: string;
      direction: "up" | "down" | "stable";
      change: number;
      significance: "low" | "medium" | "high";
    }>;
    forecasts: {
      estimatedCompletion: Date;
      confidenceInterval: { min: Date; max: Date };
      riskFactors: string[];
    };
  }> {
    try {
      // Gather progress data using MCP tools
      const progressData = await this.orchestrateTools(
        `Track progress for board ${boardId} over ${timeRange}`,
        { ...context, boardId },
        ["analytics_analyze_project_health", "tasks_search_tasks"]
      );

      // Generate progress analysis
      const progressResult = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a project progress tracking expert. Analyze project data to provide progress insights and forecasts.`,
        prompt: `Analyze this project progress data:

Data: ${JSON.stringify(progressData.results, null, 2)}
Time range: ${timeRange}

Provide comprehensive progress tracking analysis.`,
        schema: z.object({
          progressSummary: z.object({
            completedTasks: z.number(),
            totalTasks: z.number(),
            completionRate: z.number().min(0).max(1),
            onTrackMilestones: z.number(),
            delayedMilestones: z.number(),
          }),
          trends: z.array(
            z.object({
              metric: z.string(),
              direction: z.enum(["up", "down", "stable"]),
              change: z.number(),
              significance: z.enum(["low", "medium", "high"]),
            })
          ),
          forecasts: z.object({
            estimatedCompletion: z.string(), // Will be converted to Date
            confidenceInterval: z.object({
              min: z.string(),
              max: z.string(),
            }),
            riskFactors: z.array(z.string()),
          }),
        }),
        temperature: 0.3,
      });

      // Convert string dates to Date objects
      const result = {
        ...progressResult.object,
        forecasts: {
          ...progressResult.object.forecasts,
          estimatedCompletion: new Date(progressResult.object.forecasts.estimatedCompletion),
          confidenceInterval: {
            min: new Date(progressResult.object.forecasts.confidenceInterval.min),
            max: new Date(progressResult.object.forecasts.confidenceInterval.max),
          },
        },
      };

      return result;
    } catch (error) {
      console.error("Progress tracking error:", error);
      throw error;
    }
  }
}

/**
 * Resource Optimizer Agent - Specializes in resource allocation
 */
export class ResourceOptimizerAgent extends BaseAIAgent {
  constructor() {
    super("resource-optimizer", "Resource Optimizer", [
      "workload_optimization",
      "skill_allocation",
      "capacity_planning",
      "team_balancing",
      "resource_forecasting",
    ]);
  }

  /**
   * Optimize team resources
   */
  async optimizeTeamResources(
    teamIds: string[],
    optimizationType: "workload" | "skills" | "deadlines",
    context: AgentContext
  ): Promise<{
    optimizations: Array<{
      userId: string;
      userName: string;
      currentWorkload: number;
      recommendedWorkload: number;
      suggestedReassignments: Array<{
        taskId: string;
        taskTitle: string;
        fromUser: string;
        toUser: string;
        reasoning: string;
      }>;
    }>;
    teamMetrics: {
      totalCapacity: number;
      utilizedCapacity: number;
      balanceScore: number;
      bottlenecks: string[];
    };
  }> {
    try {
      // Get team workload data
      const teamData = await this.orchestrateTools(
        `Analyze team resource allocation for optimization type: ${optimizationType}`,
        context,
        ["tasks_search_tasks", "analytics_analyze_project_health"]
      );

      // Generate optimization recommendations
      const optimizationResult = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a resource optimization expert. Analyze team workloads and suggest optimal resource allocation.`,
        prompt: `Optimize team resources based on this data:

Team data: ${JSON.stringify(teamData.results, null, 2)}
Optimization focus: ${optimizationType}
Team members: ${teamIds.join(", ")}

Provide specific resource optimization recommendations.`,
        schema: z.object({
          optimizations: z.array(
            z.object({
              userId: z.string(),
              userName: z.string(),
              currentWorkload: z.number().min(0).max(1),
              recommendedWorkload: z.number().min(0).max(1),
              suggestedReassignments: z.array(
                z.object({
                  taskId: z.string(),
                  taskTitle: z.string(),
                  fromUser: z.string(),
                  toUser: z.string(),
                  reasoning: z.string(),
                })
              ),
            })
          ),
          teamMetrics: z.object({
            totalCapacity: z.number(),
            utilizedCapacity: z.number(),
            balanceScore: z.number().min(0).max(1),
            bottlenecks: z.array(z.string()),
          }),
        }),
        temperature: 0.4,
      });

      return optimizationResult.object;
    } catch (error) {
      console.error("Resource optimization error:", error);
      throw error;
    }
  }
}

// Agent factory for creating specialized agents
export class AgentFactory {
  private static agents: Map<string, BaseAIAgent> = new Map();

  static async getAgent(agentType: "analyzer" | "recommender" | "tracker" | "optimizer"): Promise<BaseAIAgent> {
    if (this.agents.has(agentType)) {
      return this.agents.get(agentType)!;
    }

    let agent: BaseAIAgent;

    switch (agentType) {
      case "analyzer":
        agent = new ProjectAnalyzerAgent();
        break;
      case "recommender":
        agent = new TaskRecommenderAgent();
        break;
      case "tracker":
        agent = new ProgressTrackerAgent();
        break;
      case "optimizer":
        agent = new ResourceOptimizerAgent();
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    await agent.initialize();
    this.agents.set(agentType, agent);

    return agent;
  }

  static getAvailableAgents(): string[] {
    return ["analyzer", "recommender", "tracker", "optimizer"];
  }

  static async getAllAgents(): Promise<BaseAIAgent[]> {
    const agents = await Promise.all(
      this.getAvailableAgents().map(type => this.getAgent(type as any))
    );
    return agents;
  }
}
```

### Batch 4.4: Agent Orchestration & Management

**Estimated Time**: 2-3 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create agent orchestration service
- [ ] Implement multi-agent coordination
- [ ] Add agent selection logic
- [ ] Create performance monitoring

#### Agent Orchestration Implementation:
Create `/lib/ai/agent-orchestrator.ts`:

```typescript
import { BaseAIAgent, AgentContext, AgentMessage } from "./agent-core";
import { AgentFactory } from "./specialized-agents";
import { generateObject } from "ai";
import { aiConfig } from "./config";
import { z } from "zod";

export interface OrchestrationRequest {
  query: string;
  context: AgentContext;
  preferredAgent?: string;
  multiAgentMode?: boolean;
  maxAgents?: number;
}

export interface OrchestrationResponse {
  primaryResponse: string;
  agentResponses: Array<{
    agentRole: string;
    response: string;
    confidence: number;
    processingTime: number;
  }>;
  coordinatedInsights?: string;
  metadata: {
    agentsUsed: string[];
    totalProcessingTime: number;
    orchestrationStrategy: string;
  };
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private performanceMetrics: Map<string, {
    totalQueries: number;
    avgProcessingTime: number;
    avgConfidence: number;
    successRate: number;
  }> = new Map();

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Select the best agent(s) for a given query
   */
  async selectAgents(query: string, context: AgentContext): Promise<{
    primaryAgent: string;
    supportingAgents?: string[];
    reasoning: string;
  }> {
    const selectionPrompt = `Analyze this query and select the best AI agent(s) to handle it:

Query: "${query}"
Context: Board ID: ${context.boardId || "none"}, Task ID: ${context.taskId || "none"}

Available agents:
- analyzer: Project health analysis, bottleneck identification, performance metrics
- recommender: Task prioritization, assignment optimization, workload balancing  
- tracker: Progress monitoring, deadline tracking, milestone analysis
- optimizer: Resource allocation, capacity planning, team balancing

Select the primary agent and any supporting agents that would be helpful.`;

    try {
      const result = await generateObject({
        model: aiConfig.chatModel,
        system: "You are an expert at routing queries to the most appropriate AI agents based on their capabilities.",
        prompt: selectionPrompt,
        schema: z.object({
          primaryAgent: z.enum(["analyzer", "recommender", "tracker", "optimizer"]),
          supportingAgents: z.array(z.enum(["analyzer", "recommender", "tracker", "optimizer"])).optional(),
          reasoning: z.string(),
        }),
        temperature: 0.2,
      });

      return result.object;
    } catch (error) {
      console.error("Agent selection error:", error);
      
      // Fallback selection based on keywords
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes("recommend") || queryLower.includes("suggest")) {
        return { primaryAgent: "recommender", reasoning: "Fallback: Query contains recommendation keywords" };
      }
      if (queryLower.includes("analyze") || queryLower.includes("health")) {
        return { primaryAgent: "analyzer", reasoning: "Fallback: Query contains analysis keywords" };
      }
      if (queryLower.includes("progress") || queryLower.includes("track")) {
        return { primaryAgent: "tracker", reasoning: "Fallback: Query contains tracking keywords" };
      }
      if (queryLower.includes("team") || queryLower.includes("resource")) {
        return { primaryAgent: "optimizer", reasoning: "Fallback: Query contains resource keywords" };
      }
      
      return { primaryAgent: "analyzer", reasoning: "Fallback: Default to analyzer" };
    }
  }

  /**
   * Process query using single agent
   */
  async processSingleAgent(
    query: string,
    context: AgentContext,
    agentType: string
  ): Promise<OrchestrationResponse> {
    const startTime = Date.now();

    try {
      const agent = await AgentFactory.getAgent(agentType as any);
      const result = await agent.processQuery(query, context);

      const totalProcessingTime = Date.now() - startTime;

      this.updatePerformanceMetrics(agentType, {
        processingTime: totalProcessingTime,
        confidence: result.metadata.confidence || 0,
        success: true,
      });

      return {
        primaryResponse: result.response,
        agentResponses: [
          {
            agentRole: agent.getStatus().role,
            response: result.response,
            confidence: result.metadata.confidence || 0,
            processingTime: result.metadata.processingTime || totalProcessingTime,
          },
        ],
        metadata: {
          agentsUsed: [agentType],
          totalProcessingTime,
          orchestrationStrategy: "single-agent",
        },
      };
    } catch (error) {
      console.error(`Single agent processing error (${agentType}):`, error);

      this.updatePerformanceMetrics(agentType, {
        processingTime: Date.now() - startTime,
        confidence: 0,
        success: false,
      });

      return {
        primaryResponse: "I encountered an error while processing your request. Please try again.",
        agentResponses: [],
        metadata: {
          agentsUsed: [],
          totalProcessingTime: Date.now() - startTime,
          orchestrationStrategy: "error-fallback",
        },
      };
    }
  }

  /**
   * Process query using multiple agents collaboratively
   */
  async processMultiAgent(
    query: string,
    context: AgentContext,
    agentTypes: string[]
  ): Promise<OrchestrationResponse> {
    const startTime = Date.now();

    try {
      // Process query with all selected agents in parallel
      const agentPromises = agentTypes.map(async (agentType) => {
        try {
          const agent = await AgentFactory.getAgent(agentType as any);
          const result = await agent.processQuery(query, context);
          
          this.updatePerformanceMetrics(agentType, {
            processingTime: result.metadata.processingTime || 0,
            confidence: result.metadata.confidence || 0,
            success: true,
          });

          return {
            agentType,
            agentRole: agent.getStatus().role,
            response: result.response,
            confidence: result.metadata.confidence || 0,
            processingTime: result.metadata.processingTime || 0,
            success: true,
          };
        } catch (error) {
          console.error(`Multi-agent processing error (${agentType}):`, error);
          
          this.updatePerformanceMetrics(agentType, {
            processingTime: 0,
            confidence: 0,
            success: false,
          });

          return {
            agentType,
            agentRole: agentType,
            response: `Error processing with ${agentType} agent`,
            confidence: 0,
            processingTime: 0,
            success: false,
          };
        }
      });

      const agentResults = await Promise.all(agentPromises);
      const successfulResults = agentResults.filter(r => r.success);

      if (successfulResults.length === 0) {
        return {
          primaryResponse: "I encountered errors with all agents. Please try again.",
          agentResponses: [],
          metadata: {
            agentsUsed: [],
            totalProcessingTime: Date.now() - startTime,
            orchestrationStrategy: "multi-agent-failed",
          },
        };
      }

      // Coordinate insights from multiple agents
      const coordinatedInsights = await this.coordinateAgentInsights(
        query,
        successfulResults
      );

      // Select primary response (highest confidence)
      const primaryResult = successfulResults.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      const totalProcessingTime = Date.now() - startTime;

      return {
        primaryResponse: coordinatedInsights || primaryResult.response,
        agentResponses: successfulResults.map(r => ({
          agentRole: r.agentRole,
          response: r.response,
          confidence: r.confidence,
          processingTime: r.processingTime,
        })),
        coordinatedInsights,
        metadata: {
          agentsUsed: successfulResults.map(r => r.agentType),
          totalProcessingTime,
          orchestrationStrategy: "multi-agent-collaborative",
        },
      };
    } catch (error) {
      console.error("Multi-agent orchestration error:", error);

      return {
        primaryResponse: "I encountered an error during multi-agent processing. Please try again.",
        agentResponses: [],
        metadata: {
          agentsUsed: [],
          totalProcessingTime: Date.now() - startTime,
          orchestrationStrategy: "multi-agent-error",
        },
      };
    }
  }

  /**
   * Coordinate insights from multiple agents
   */
  private async coordinateAgentInsights(
    originalQuery: string,
    agentResults: Array<{
      agentType: string;
      agentRole: string;
      response: string;
      confidence: number;
    }>
  ): Promise<string> {
    if (agentResults.length <= 1) {
      return agentResults[0]?.response || "";
    }

    try {
      const coordinationPrompt = `You are coordinating insights from multiple AI agents to provide a comprehensive response.

Original query: "${originalQuery}"

Agent responses:
${agentResults
  .map(r => `${r.agentRole} (confidence: ${r.confidence}): ${r.response}`)
  .join("\n\n")}

Synthesize these agent responses into a cohesive, comprehensive answer that addresses the user's query. Highlight complementary insights and resolve any conflicts between agent responses.`;

      const coordinatedResponse = await generateObject({
        model: aiConfig.chatModel,
        system: "You are an expert at synthesizing insights from multiple AI agents into coherent, comprehensive responses.",
        prompt: coordinationPrompt,
        schema: z.object({
          synthesizedResponse: z.string(),
          keyInsights: z.array(z.string()),
          confidence: z.number().min(0).max(1),
        }),
        temperature: 0.5,
      });

      return coordinatedResponse.object.synthesizedResponse;
    } catch (error) {
      console.error("Agent coordination error:", error);
      
      // Fallback: return the highest confidence response
      const bestResponse = agentResults.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
      
      return bestResponse.response;
    }
  }

  /**
   * Main orchestration method
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const { query, context, preferredAgent, multiAgentMode = false, maxAgents = 3 } = request;

    try {
      let agentSelection;
      
      if (preferredAgent) {
        agentSelection = {
          primaryAgent: preferredAgent,
          supportingAgents: [],
          reasoning: "User specified preferred agent",
        };
      } else {
        agentSelection = await this.selectAgents(query, context);
      }

      if (multiAgentMode && agentSelection.supportingAgents?.length) {
        const agentsToUse = [
          agentSelection.primaryAgent,
          ...agentSelection.supportingAgents.slice(0, maxAgents - 1),
        ];
        
        return await this.processMultiAgent(query, context, agentsToUse);
      } else {
        return await this.processSingleAgent(query, context, agentSelection.primaryAgent);
      }
    } catch (error) {
      console.error("Orchestration error:", error);
      
      return {
        primaryResponse: "I encountered an error while processing your request. Please try again or contact support.",
        agentResponses: [],
        metadata: {
          agentsUsed: [],
          totalProcessingTime: 0,
          orchestrationStrategy: "error",
        },
      };
    }
  }

  /**
   * Update performance metrics for an agent
   */
  private updatePerformanceMetrics(
    agentType: string,
    metrics: { processingTime: number; confidence: number; success: boolean }
  ): void {
    const current = this.performanceMetrics.get(agentType) || {
      totalQueries: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      successRate: 0,
    };

    const newTotal = current.totalQueries + 1;
    const newAvgProcessingTime = 
      (current.avgProcessingTime * current.totalQueries + metrics.processingTime) / newTotal;
    const newAvgConfidence = 
      (current.avgConfidence * current.totalQueries + metrics.confidence) / newTotal;
    const successCount = Math.floor(current.successRate * current.totalQueries) + (metrics.success ? 1 : 0);
    const newSuccessRate = successCount / newTotal;

    this.performanceMetrics.set(agentType, {
      totalQueries: newTotal,
      avgProcessingTime: newAvgProcessingTime,
      avgConfidence: newAvgConfidence,
      successRate: newSuccessRate,
    });
  }

  /**
   * Get performance metrics for all agents
   */
  getPerformanceMetrics(): Record<string, {
    totalQueries: number;
    avgProcessingTime: number;
    avgConfidence: number;
    successRate: number;
  }> {
    const metrics: Record<string, any> = {};
    
    for (const [agentType, data] of this.performanceMetrics.entries()) {
      metrics[agentType] = { ...data };
    }
    
    return metrics;
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();
```

## Testing & Validation

### Batch 4.5: Agent Testing & Integration

**Estimated Time**: 2-3 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create agent integration tests
- [ ] Add orchestration performance tests
- [ ] Implement agent capability validation
- [ ] Create load testing utilities

#### Create `/lib/ai/__tests__/agent-system.test.ts`:

```typescript
import { AgentFactory } from "../specialized-agents";
import { agentOrchestrator } from "../agent-orchestrator";
import { mcpClientPool } from "../mcp-client-pool";

describe("AI Agent System Integration", () => {
  beforeAll(async () => {
    await mcpClientPool.initialize();
  });

  afterAll(async () => {
    await mcpClientPool.close();
  });

  describe("Agent Factory", () => {
    test("should create specialized agents", async () => {
      const analyzer = await AgentFactory.getAgent("analyzer");
      expect(analyzer.getStatus().role).toBe("Project Analyzer");
      expect(analyzer.getCapabilities()).toContain("project_health_analysis");
    });

    test("should reuse existing agents", async () => {
      const agent1 = await AgentFactory.getAgent("recommender");
      const agent2 = await AgentFactory.getAgent("recommender");
      expect(agent1).toBe(agent2); // Should be same instance
    });
  });

  describe("Agent Orchestrator", () => {
    test("should select appropriate agent for analysis queries", async () => {
      const selection = await agentOrchestrator.selectAgents(
        "How is my project performing?",
        { userId: "test", companyId: "test" }
      );

      expect(selection.primaryAgent).toBe("analyzer");
    });

    test("should process single agent requests", async () => {
      const response = await agentOrchestrator.processSingleAgent(
        "What tasks should I prioritize?",
        { userId: "test", companyId: "test" },
        "recommender"
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses).toHaveLength(1);
      expect(response.metadata.orchestrationStrategy).toBe("single-agent");
    });

    test("should handle multi-agent coordination", async () => {
      const response = await agentOrchestrator.processMultiAgent(
        "How is my project doing and what should I focus on next?",
        { userId: "test", companyId: "test" },
        ["analyzer", "recommender"]
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses.length).toBeGreaterThan(0);
      expect(response.metadata.orchestrationStrategy).toBe("multi-agent-collaborative");
    });

    test("should handle orchestration errors gracefully", async () => {
      const response = await agentOrchestrator.processSingleAgent(
        "test query",
        { userId: "", companyId: "" }, // Invalid context
        "analyzer"
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.metadata.orchestrationStrategy).toMatch(/error/);
    });
  });

  describe("Performance Metrics", () => {
    test("should track agent performance", async () => {
      await agentOrchestrator.processSingleAgent(
        "Test query for metrics",
        { userId: "test", companyId: "test" },
        "tracker"
      );

      const metrics = agentOrchestrator.getPerformanceMetrics();
      expect(metrics.tracker).toBeDefined();
      expect(metrics.tracker.totalQueries).toBeGreaterThan(0);
    });
  });
});
```

## Success Criteria

- [ ] MCP client pool maintains stable connections to all servers
- [ ] All specialized agents initialize successfully with their tools
- [ ] Agent selection logic chooses appropriate agents >90% of the time
- [ ] Single agent processing completes within 5 seconds average
- [ ] Multi-agent coordination provides coherent combined responses
- [ ] Performance metrics track agent effectiveness accurately
- [ ] Error handling gracefully degrades functionality
- [ ] Memory management prevents conversation history bloat

## Next Steps

After completing Phase 4:
1. Proceed to Phase 5: API & Interface Layer
2. Set up production monitoring for agent performance
3. Configure agent scaling and load balancing
4. Begin user acceptance testing with agent capabilities

## Troubleshooting

### Common Issues:
- **MCP connection failures**: Check server health and retry mechanisms
- **Agent initialization timeout**: Verify MCP tools are accessible
- **Multi-agent coordination conflicts**: Review response synthesis logic
- **Memory leaks**: Monitor conversation history cleanup

### Debug Commands:
```bash
# Test agent orchestration
curl -X POST http://localhost:3000/api/ai/agents \
  -H "Content-Type: application/json" \
  -d '{"query":"How is my project doing?","agentType":"analyzer"}'

# Check MCP server health
curl -X GET http://localhost:3000/api/health/mcp

# Monitor agent performance
curl -X GET http://localhost:3000/api/ai/agents/metrics
```