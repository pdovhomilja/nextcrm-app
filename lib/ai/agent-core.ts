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
    history: ModelMessage[]
  ) {
    console.log(
      `Processing query for agent ${this.agentId} with role ${this.role}`
    );
    const startTime = Date.now();
    const availableTools = this.getAvailableTools();

    const systemPrompt = `You are a helpful AI assistant named ${this.role}. 
                         Your role is to assist users by answering questions and using available tools to manage tasks, projects, and users. 
                         You can ask for clarification if a query is ambiguous.
                         The user context is: ${JSON.stringify(context)}`;

    try {
      const result = streamText({
        model: this.model,
        system: systemPrompt,
        messages: [
          ...history,
          {
            role: "user",
            content: query,
          },
        ],
        tools: availableTools,
        onFinish: async ({ toolCalls }) => {
          if (!toolCalls || toolCalls.length === 0) {
            return;
          }

          const toolResults: ToolResult[] = [];
          for (const toolCall of toolCalls) {
            const { toolName } = toolCall;
            const args = (toolCall as { input: unknown }).input;
            const tool = availableTools[toolName];

            if (!tool || !tool.execute) {
              // This should not happen if the LLM is behaving
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
              const result = await tool.execute(args, toolCallOptions);
              toolResults.push({
                toolCallId: toolCall.toolCallId,
                toolName,
                args,
                result,
              });
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

          // Here you would typically continue the conversation by sending the tool results
          // back to the model. For this refactoring, we will return them directly.
          // This part of the logic will need to be completed in the next phase.
        },
      });

      // We need to handle the case where onFinish produces tool results.
      // This requires a more complex state management than a single return.
      // For now, let's return the direct result of streamText and handle
      // the full tool execution loop later.

      const processingTime = Date.now() - startTime;
      console.log(
        `Query processed in ${
          processingTime
        }ms. Finish reason: ${result.finishReason}`
      );

      return {
        text: await result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults,
        metadata: {
          processingTime,
          agentRole: this.role,
          finishReason: result.finishReason,
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
