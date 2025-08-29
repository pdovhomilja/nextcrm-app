import {
  streamText,
  ModelMessage,
  Tool,
  LanguageModel,
  ToolCallOptions,
  // ToolResult,
  // ToolCall,
} from "ai";
import { aiConfig } from "./config";
import { commonTools } from "./tools/common-tools";
import { ragTools } from "./tools/rag-tools";

interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

interface ToolResult extends ToolCall {
  result: unknown;
}

export interface AgentContext {
  userId: string;
  companyId: string;
  boardId?: string;
  taskId?: string;
  conversationId?: string;
  sessionData?: Record<string, unknown>;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "tool-result";
            toolName: string;
            toolCallId: string;
            result: unknown;
          }
      >;
  timestamp: Date;
}

export class BaseAIAgent {
  protected agentId: string;
  protected role: string;
  protected conversationHistory: Map<string, ModelMessage[]> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected tools: Record<string, Tool<any, any>> = {};
  protected model: LanguageModel;

  constructor(
    agentId: string,
    role: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: Record<string, Tool<any, any>> = {},
    model: LanguageModel = aiConfig.chatModel
  ) {
    this.agentId = agentId;
    this.role = role;
    this.tools = tools;
    this.model = model;
  }

  /**
   * The primary method for processing a user query.
   * This has been refactored to use a single, iterative agentic loop
   * with manual tool execution to inject context.
   */
  async processQuery(
    query: string,
    context: AgentContext,
    history: ModelMessage[],
    systemPromptOverride?: string
  ) {
    console.log(
      `Processing query for agent ${this.agentId} with role ${this.role}`
    );
    const startTime = Date.now();
    const availableTools = this.getAvailableTools();

    const effectiveSystemPrompt = systemPromptOverride || `You are a helpful AI assistant named ${this.role}. 
                         Your role is to assist users by answering questions and using available tools to manage tasks, projects, and users. 
                         You can ask for clarification if a query is ambiguous.
                         The user context is: ${JSON.stringify(context)}`;

    try {
      // Use a Promise to properly handle tool execution completion
      let onFinishPromise: Promise<ToolResult[]> | null = null;

      const result = streamText({
        model: this.model,
        system: effectiveSystemPrompt,
        messages: [
          ...history,
          {
            role: "user",
            content: query,
          },
        ],
        tools: availableTools,
        onFinish: async ({ toolCalls }) => {
          // Create and store the promise for tool execution
          onFinishPromise = (async () => {
            if (!toolCalls || toolCalls.length === 0) {
              console.log(`No tool calls to execute.`);
              return [];
            }

            console.log(`Starting execution of ${toolCalls.length} tool calls.`);
            const toolResults: ToolResult[] = [];
            for (const toolCall of toolCalls) {
              const { toolName } = toolCall;
              const args = (toolCall as { input: unknown }).input;
              const tool = availableTools[toolName];

              if (!tool || !tool.execute) {
                console.warn(
                  `LLM tried to call non-existent tool or tool without execute method: ${toolName}`
                );
                continue;
              }

              try {
                const toolCallOptions: ToolCallOptions = {
                  toolCallId: toolCall.toolCallId,
                  messages: [...history, { role: "user", content: query }],
                };
                const toolResult = await tool.execute(args, toolCallOptions);
                toolResults.push({
                  toolCallId: toolCall.toolCallId,
                  toolName,
                  args,
                  result: toolResult,
                });
                console.log(`Tool ${toolName} executed successfully.`);
              } catch (error) {
                console.error(`Error executing tool ${toolName}:`, error);
                toolResults.push({
                  toolCallId: toolCall.toolCallId,
                  toolName,
                  args,
                  result: {
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  },
                });
              }
            }

            console.log(`Tool execution completed. Captured ${toolResults.length} tool results.`);
            return toolResults;
          })();
        },
      });

      // Wait for the stream to complete
      const text = await result.text;
      const finishReason = await result.finishReason;
      const toolCalls = await result.toolCalls;

      // Wait for tool execution to complete if it was triggered
      const capturedToolResults = onFinishPromise ? await onFinishPromise : [];

      const processingTime = Date.now() - startTime;
      console.log(
        `Query processed in ${processingTime}ms. Finish reason: ${finishReason}. Tool results captured: ${capturedToolResults.length}`
      );

      return {
        text,
        toolCalls,
        toolResults: capturedToolResults,
        metadata: {
          processingTime,
          agentRole: this.role,
          finishReason,
        },
      };
    } catch (error) {
      console.error(`${this.role} agent processing error:`, error);
      return {
        text: "I encountered an error while processing your request. Please try again.",
        toolCalls: [],
        toolResults: [],
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Aggregates all tools available to the agent.
   * In later phases, this will be more dynamic based on the router's output.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getAvailableTools(): Record<string, Tool<any, any>> {
    // For Phase 1, we manually combine the initial toolsets.
    // This will be replaced by a more dynamic mechanism in Phase 3.
    return {
      ...this.tools,
      ...commonTools,
      ...ragTools,
    };
  }

  /**
   * Updates the conversation history for a given session.
   */
  updateConversationHistory(
    conversationId: string,
    message: ModelMessage
  ): void {
    if (!conversationId) return;

    const history = this.conversationHistory.get(conversationId) || [];
    history.push(message);

    // Keep only the last 20 messages to prevent context overflow
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationHistory.set(conversationId, history);
  }

  /**
   * Retrieves the conversation history for a given session.
   */
  getConversationHistory(conversationId: string): ModelMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  /**
   * Clears the conversation history for a given session.
   */
  clearConversationHistory(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Gets the current status of the agent.
   */
  getStatus(): {
    agentId: string;
    role: string;
    toolCount: number;
    activeConversations: number;
  } {
    return {
      agentId: this.agentId,
      role: this.role,
      toolCount: Object.keys(this.tools).length,
      activeConversations: this.conversationHistory.size,
    };
  }
}
