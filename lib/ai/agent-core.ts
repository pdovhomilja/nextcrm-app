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
    const queryLower = query.toLowerCase();
    const isSearchQuery = queryLower.includes('search') || queryLower.includes('find') || queryLower.includes('look for') || 
                         queryLower.includes('is there') || queryLower.includes('do we have') || queryLower.includes('show me') ||
                         queryLower.includes('list') || queryLower.includes('get');
    
    const isUpdateQuery = queryLower.includes('mark') || queryLower.includes('make') || queryLower.includes('set') ||
                         queryLower.includes('complete') || queryLower.includes('finish') || queryLower.includes('update') ||
                         (queryLower.includes('task') && (queryLower.includes('done') || queryLower.includes('completed')));
    
    const decisionPrompt = `As a ${this.role} agent, analyze this query and decide the best approach.

Query: "${query}"
Available capabilities: ${this.capabilities.join(", ")}
Available MCP tools: ${mcpToolCount > 0 ? Object.keys(this.mcpTools).slice(0, 10).join(", ") : "NONE - tools are not available"}${Object.keys(this.mcpTools).length > 10 ? "..." : ""}

${mcpToolCount === 0 ? "IMPORTANT: Since no MCP tools are available, you should choose 'respond' action instead of 'use_tools'." : ""}

${isSearchQuery && mcpToolCount > 0 ? "IMPORTANT: This appears to be a search/lookup query. You should use 'use_tools' action with search tools like 'tasks_search_tasks' to find specific information." : ""}

${isUpdateQuery && mcpToolCount > 0 ? "IMPORTANT: This appears to be a task update/completion request. You should use 'use_tools' action. If no specific task ID is available, first search for the task using 'tasks_search_tasks', then update it using 'tasks_update_task'." : ""}

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

IMPORTANT: For queries asking about specific tasks, searching, finding, or looking up information (like "is there a task", "find task", "show me tasks"), you should choose "use_tools" action and specify tools like "tasks_search_tasks" to search the actual database.

IMPORTANT: For task completion/update queries (like "mark task as done", "complete this task", "make task done"), you should choose "use_tools" action. If no specific task ID is provided, first use "tasks_search_tasks" to find the task, then "tasks_update_task" to update its status.

Response strategies:
- direct: Simple knowledge-based response
- rag_enhanced: Use retrieved context from documents
- tool_orchestrated: Coordinate multiple tools (USE THIS for search queries)
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

    // Check for task completion workflow
    const hasSearchAndUpdate = toolNames.includes('tasks_search_tasks') && toolNames.includes('tasks_update_task');
    const isCompletionQuery = query.toLowerCase().includes('done') || query.toLowerCase().includes('complete') || 
                             query.toLowerCase().includes('mark') || query.toLowerCase().includes('finish');

    if (hasSearchAndUpdate && isCompletionQuery) {
      // Sequential workflow: search first, then update with found task ID
      try {
        console.log('Executing sequential search-then-update workflow');
        
        // Step 1: Search for the task
        const searchResult = await this.executeTool('tasks_search_tasks', query, context);
        results.push({
          toolName: 'tasks_search_tasks',
          result: searchResult,
          success: true,
        });

        // Step 2: If task found, update it
        if (searchResult.executed && searchResult.result?.content?.[0]?.text) {
          const searchData = JSON.parse(searchResult.result.content[0].text);
          
          if (searchData.tasks && searchData.tasks.length > 0) {
            const foundTask = searchData.tasks[0];
            console.log(`Found task for completion: ${foundTask.id} (${foundTask.title})`);
            
            // Update the task to completed status
            const updateResult = await this.executeTool('tasks_update_task', query, {
              ...context,
              taskId: foundTask.id
            });
            
            results.push({
              toolName: 'tasks_update_task',
              result: updateResult,
              success: updateResult.executed,
            });
          } else {
            console.log('No tasks found to complete');
            results.push({
              toolName: 'tasks_update_task',
              result: { executed: false, error: 'No matching tasks found to complete' },
              success: false,
            });
          }
        } else {
          console.log('Search tool failed, cannot proceed with update');
          results.push({
            toolName: 'tasks_update_task',
            result: { executed: false, error: 'Search failed, cannot find task to update' },
            success: false,
          });
        }

      } catch (error) {
        console.error('Sequential workflow failed:', error);
        results.push({
          toolName: 'tasks_update_task',
          result: { executed: false, error: error instanceof Error ? error.message : 'Sequential workflow failed' },
          success: false,
        });
      }
    } else {
      // Normal parallel execution for other workflows
      for (const toolName of toolNames) {
        try {
          const tool = this.mcpTools[toolName];
          if (!tool) {
            console.warn(`Tool not available: ${toolName}`);
            continue;
          }

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
        // Extract meaningful search terms from conversational queries
        let searchTerm = query;
        
        // Remove common question patterns to extract the core search term
        const patterns = [
          /is there (?:a |an )?(?:task |item |work )?(?:called |named |titled |with title )?['""]?([^'""\?]+)['""]?\??/i,
          /find (?:a |the )?(?:task |item |work )?(?:called |named |titled |with title )?['""]?([^'""\?]+)['""]?\??/i,
          /show me (?:a |the )?(?:task |item |work )?(?:called |named |titled |with title )?['""]?([^'""\?]+)['""]?\??/i,
          /do we have (?:a |an )?(?:task |item |work )?(?:called |named |titled |with title )?['""]?([^'""\?]+)['""]?\??/i,
          /search for (?:a |the )?(?:task |item |work )?(?:called |named |titled |with title )?['""]?([^'""\?]+)['""]?\??/i
        ];
        
        for (const pattern of patterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            searchTerm = match[1].trim();
            break;
          }
        }
        
        console.log(`Extracted search term: "${searchTerm}" from query: "${query}"`);
        
        return {
          ...baseParams,
          boardId: context.boardId,
          searchTerm: searchTerm,
          limit: 10
        };
      
      case 'get_tasks':
        return {
          ...baseParams,
          boardId: context.boardId,
          limit: 20
        };
      
      case 'update_task':
        // Extract task completion/update requests
        const updatePatterns = [
          /(?:mark|make|set) (?:this |the )?(?:task )?(?:as )?(?:done|completed|finished|complete)/i,
          /(?:complete|finish) (?:this |the )?(?:task)?/i,
          /task (?:is |should be )?(?:done|completed|finished)/i
        ];
        
        let isCompletionRequest = false;
        for (const pattern of updatePatterns) {
          if (query.match(pattern)) {
            isCompletionRequest = true;
            break;
          }
        }
        
        // If it's a completion request but no specific taskId, we need to search for the task first
        if (isCompletionRequest && !context.taskId) {
          // Extract task reference from completion queries like "make 'test tsd' task done"
          const taskRefPatterns = [
            /(?:mark|make|set|complete|finish)\s+['\"\"]([^'\"\"]+)['\"\"](?:\s+(?:task|item))?(?:\s+(?:as\s+)?(?:done|completed|finished|complete))?/i,
            /(?:mark|make|set|complete|finish)\s+(?:the\s+)?(?:task\s+)?['\"\"]([^'\"\"]+)['\"\"](?:\s+(?:as\s+)?(?:done|completed|finished|complete))?/i,
            /(?:task\s+)?['\"\"]([^'\"\"]+)['\"\"](?:\s+(?:task|item))?\s+(?:done|completed|finished|complete)/i,
            /(?:task |item )(?:called |named |titled )?['\"\"]?([^'\"\"\\?]+)['\"\"]?/i,
          ];
          
          for (const pattern of taskRefPatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
              console.log(`Extracted task reference for completion: "${match[1]}" from query: "${query}"`);
              // Return search parameters to find the task first
              return {
                ...baseParams,
                searchTerm: match[1].trim(),
                limit: 5,
                // Signal this is for task completion
                _forCompletion: true
              };
            }
          }
          
          console.log(`No task reference found in completion query: "${query}"`);
        }
        
        // If we have a taskId (from sequential workflow), use it for direct update
        if (context.taskId) {
          return {
            ...baseParams,
            taskId: context.taskId,
            status: isCompletionRequest ? 'COMPLETED' : undefined
          };
        }
        
        return {
          ...baseParams,
          status: isCompletionRequest ? 'COMPLETED' : undefined
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
    console.log('Synthesizing tool response for query:', query);
    console.log('Tool execution summary:', toolResult.summary);
    console.log('Tool results raw:', JSON.stringify(toolResult.results, null, 2));
    
    // Extract successful results and parse the nested JSON content
    const successfulResults = toolResult.results.filter(r => r.success && r.result?.result);
    
    // Parse the nested JSON content from MCP responses
    const parsedResults = successfulResults.map(result => {
      try {
        // The actual data is nested in result.result.content[0].text as JSON string
        if (result.result?.result?.content?.[0]?.text) {
          const parsedContent = JSON.parse(result.result.result.content[0].text);
          console.log('Parsed MCP content:', parsedContent);
          return {
            ...result,
            parsedContent
          };
        }
        return result;
      } catch (error) {
        console.error('Failed to parse MCP result content:', error);
        return result;
      }
    });
    
    console.log('Parsed results for synthesis:', JSON.stringify(parsedResults, null, 2));

    const synthesisPrompt = `Based on the tool execution results, provide a comprehensive response to the user's query.

Original query: "${query}"
Tool execution summary: ${toolResult.summary}

Parsed tool results with actual data:
${JSON.stringify(parsedResults, null, 2)}

IMPORTANT: Look for the "parsedContent" field in each result which contains the actual data from the MCP tools. 
If you see tasks data with foundTasks > 0, that means tasks were found successfully.
Focus on the actual task information in the parsed content, not just the tool execution metadata.

Synthesize this information into a clear, helpful response for the user. If tasks were found, list them clearly with their details.`;

    const response = await generateText({
      model: aiConfig.chatModel,
      system: `You are a ${this.role} assistant that synthesizes information from various tools to provide comprehensive responses.

CRITICAL: When interpreting MCP tool results, always look for the "parsedContent" field which contains the actual data.
If you see "foundTasks" with a number > 0 in the parsed content, those are real tasks that were found.
If you see a "tasks" array in the parsed content, those are the actual task details.
Do not say "no results found" if the parsed content shows tasks were actually found.`,
      prompt: synthesisPrompt,
      temperature: 0.6,
    });

    console.log('Synthesized response:', response.text);
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
