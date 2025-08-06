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
      await mcpClientPool.initialize();
      this.mcpTools = await mcpClientPool.getTools();
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
          const toolResult = await this.orchestrateTools(
            query,
            context,
            decision.toolsToUse || []
          );
          toolResults = toolResult.results;
          response = await this.synthesizeToolResponse(
            query,
            toolResult,
            context
          );
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
    const decisionPrompt = `As a ${this.role} agent, analyze this query and decide the best approach.

Query: "${query}"
Available capabilities: ${this.capabilities.join(", ")}
Available MCP tools: ${Object.keys(this.mcpTools).slice(0, 10).join(", ")}${Object.keys(this.mcpTools).length > 10 ? "..." : ""}

Conversation context: ${history
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}

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
   * Execute a specific MCP tool (placeholder implementation)
   */
  protected async executeTool(
    toolName: string,
    query: string,
    context: AgentContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
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
