import { generateText, generateObject } from "ai";
import { aiConfig } from "./config";
import { simpleMCPClientPool } from "./simple-mcp-client";
import { ragProcessor, RAGQuery } from "./rag-processor";
import { z } from "zod";

export interface AgentContext {
  userId: string;
  companyId: string;
  boardId?: string;
  taskId?: string;
  conversationId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  responseStrategy:
    | "direct"
    | "rag_enhanced"
    | "tool_orchestrated"
    | "analytical";
}

export abstract class BaseAIAgent {
  protected agentId: string;
  protected role: string;
  protected capabilities: string[];
  protected conversationHistory: Map<string, AgentMessage[]> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await simpleMCPClientPool.initialize();
      this.mcpTools = await simpleMCPClientPool.getTools();
      console.log(
        `${this.role} agent initialized with ${Object.keys(this.mcpTools).length} tools`
      );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolResults?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Make decision about how to handle the query
      const decision = await this.makeDecision(
        query,
        context,
        conversationHistory
      );

      let response: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let toolResults: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata: Record<string, any> = {
        processingTime: 0,
        strategy: decision.responseStrategy,
        confidence: decision.confidence,
        agentRole: this.role,
      };

      // Step 2: Execute decision
      switch (decision.action) {
        case "use_tools":
          // Check if any tools are actually available
          const availableTools = (decision.toolsToUse || []).filter(toolName => this.mcpTools[toolName]);
          
          if (availableTools.length === 0) {
            // No tools available, fall back to direct response
            console.log("No MCP tools available, falling back to direct response");
            response = await this.generateDirectResponse(query, context, conversationHistory);
          } else {
            const toolResult = await this.orchestrateTools(
              query,
              context,
              decision.toolsToUse || []
            );
            toolResults = toolResult.results;
            
            // Check if any tools actually succeeded
            const successfulResults = toolResult.results.filter(r => r.success);
            if (successfulResults.length === 0) {
              // All tools failed, fall back to direct response
              console.log("All MCP tools failed, falling back to direct response");
              response = await this.generateDirectResponse(query, context, conversationHistory);
            } else {
              response = await this.synthesizeToolResponse(
                query,
                toolResult,
                context
              );
            }
          }
          break;

        case "respond":
          if (decision.responseStrategy === "rag_enhanced") {
            const ragResult = await this.processWithRAG(query, context);
            response = ragResult.response;
            metadata.ragContext = ragResult.contextSummary;
            metadata.sources = ragResult.sources;
          } else {
            response = await this.generateDirectResponse(
              query,
              context,
              conversationHistory
            );
          }
          break;

        case "request_clarification":
          response = await this.generateClarificationRequest(query, context);
          break;

        case "escalate":
          response =
            "This query requires human assistance. I've flagged it for escalation to your team lead.";
          break;

        default:
          response =
            "I need to think about how to best help you with this request.";
      }

      // Step 3: Update conversation history
      this.updateConversationHistory(context.conversationId, {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
        metadata: {
          toolCalls: decision.toolsToUse?.map((tool) => ({
            toolName: tool,
            parameters: {},
            result: {},
          })),
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
        response:
          "I encountered an error while processing your request. Please try again or rephrase your question.",
        decision: {
          action: "respond",
          reasoning: "Error occurred during processing",
          confidence: 0,
          responseStrategy: "direct",
        },
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
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
    const mcpToolCount = Object.keys(this.mcpTools).length;
    const decisionPrompt = `As a ${this.role} agent, analyze this query and decide the best approach.

Query: "${query}"
Available capabilities: ${this.capabilities.join(", ")}
Available MCP tools: ${mcpToolCount > 0 ? Object.keys(this.mcpTools).slice(0, 10).join(", ") : "NONE - tools are not available"}${Object.keys(this.mcpTools).length > 10 ? "..." : ""}

${mcpToolCount === 0 ? "IMPORTANT: Since no MCP tools are available, you should choose 'respond' action instead of 'use_tools'." : ""}

Conversation context: ${history
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}

Choose the best action and strategy for handling this query.`;

    try {
      const result = await generateObject({
        model: aiConfig.structuredOutputModel,
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
          action: z.enum([
            "respond",
            "use_tools",
            "request_clarification",
            "escalate",
          ]),
          reasoning: z.string(),
          confidence: z.number().min(0).max(1),
          toolsToUse: z.array(z.string()).optional(),
          responseStrategy: z.enum([
            "direct",
            "rag_enhanced",
            "tool_orchestrated",
            "analytical",
          ]),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ results: any[]; summary: string }> {
    console.log(`Orchestrating tools: ${toolNames.join(", ")}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const summary = `Executed ${toolNames.length} tools, ${successCount} succeeded`;

    return { results, summary };
  }

  /**
   * Execute a specific MCP tool using the simplified MCP client
   */
  protected async executeTool(
    toolName: string,
    query: string,
    context: AgentContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    try {
      // Parse the full tool name (e.g., "tasks_create_task" -> server: "tasks", method: "create_task")
      const toolParts = toolName.split('_');
      if (toolParts.length < 2) {
        throw new Error(`Invalid tool name format: ${toolName}`);
      }
      
      const serverName = toolParts[0];
      const method = toolParts.slice(1).join('_');
      
      // Prepare parameters based on the query and context
      const params = this.prepareToolParams(method, query, context);
      
      // Execute the tool via simplified MCP client
      const result = await simpleMCPClientPool.callTool(
        serverName,
        method,
        params,
        context.userId // Pass user ID for authentication
      );
      
      if (result.error) {
        throw new Error(`MCP tool error: ${result.error.message}`);
      }
      
      return {
        toolName,
        serverName,
        method,
        executed: true,
        result: result.result,
        timestamp: new Date(),
        context: context,
        query: query.substring(0, 100),
      };
    } catch (error) {
      console.error(`Tool execution failed for ${toolName}:`, error);
      return {
        toolName,
        executed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        context: context,
        query: query.substring(0, 100),
      };
    }
  }

  /**
   * Prepare tool parameters based on method and context
   */
  protected prepareToolParams(
    method: string,
    query: string,
    context: AgentContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> {
    const baseParams = {
      userId: context.userId,
      companyId: context.companyId,
      query: query
    };

    // Add context-specific parameters based on method
    switch (method) {
      case 'create_task':
        return {
          ...baseParams,
          title: query,
          description: `Task created from AI query: ${query}`,
          boardSectionId: context.boardId ? `${context.boardId}_section_1` : undefined
        };
      
      case 'search_tasks':
      case 'semantic_search':
      case 'contextual_search':
        return {
          ...baseParams,
          boardId: context.boardId,
          limit: 10
        };
      
      case 'get_tasks':
        return {
          ...baseParams,
          boardId: context.boardId,
          limit: 20
        };
      
      case 'get_boards':
        return baseParams;
      
      case 'project_health':
      case 'task_analytics':
        return {
          ...baseParams,
          boardId: context.boardId
        };
      
      default:
        return baseParams;
    }
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
  protected determineContextType(
    query: string
  ): "general" | "task_specific" | "board_analysis" | "recommendation" {
    const queryLower = query.toLowerCase();

    if (
      queryLower.includes("recommend") ||
      queryLower.includes("suggest") ||
      queryLower.includes("should")
    ) {
      return "recommendation";
    }

    if (
      queryLower.includes("analyze") ||
      queryLower.includes("performance") ||
      queryLower.includes("metrics")
    ) {
      return "board_analysis";
    }

    if (
      queryLower.includes("task") &&
      (queryLower.includes("this") || queryLower.includes("current"))
    ) {
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
        ...history.slice(-5).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.7,
    });

    return response.text;
  }

  /**
   * Synthesize response from tool results
   */
  protected async synthesizeToolResponse(
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolResult: { results: any[]; summary: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: AgentContext
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
    });

    return response.text;
  }

  /**
   * Generate clarification request
   */
  protected async generateClarificationRequest(
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: AgentContext
  ): Promise<string> {
    const clarificationPrompt = `The user asked: "${query}"

This query needs clarification to provide the best help. Generate a helpful clarification request that asks for specific details needed to assist them effectively.`;

    const response = await generateText({
      model: aiConfig.chatModel,
      system:
        "You are helpful at asking clarifying questions to better understand user needs.",
      prompt: clarificationPrompt,
      temperature: 0.6,
    });

    return response.text;
  }

  /**
   * Update conversation history
   */
  protected updateConversationHistory(
    conversationId: string | undefined,
    message: AgentMessage
  ): void {
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
