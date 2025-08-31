import { ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { AgentContext, BaseAIAgent } from "./agent-core";
import { classifyAndRouteQuery } from "./routing/router";
import { getToolkits } from "./toolkits"; // Placeholder from Phase 3
import { aiConfig } from "./config";

// This can be defined once and reused
const openai = createOpenAI();

export interface OrchestrationRequest {
  query: string;
  context: AgentContext;
  history: ModelMessage[];
}

// The response is now the direct output of the modernized BaseAIAgent
export type OrchestrationResponse = Awaited<
  ReturnType<BaseAIAgent["processQuery"]>
>;

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Main orchestration method.
   * This method replaces the previous multi-agent system with a new routing-based approach.
   */
  async orchestrate(
    query: string,
    history: ModelMessage[],
    systemPromptOverride?: string,
    requiredToolkitsOverride?: string[],
    contextOverride?: AgentContext,
  ): Promise<OrchestrationResponse> {
    const startTime = Date.now();
    const context = contextOverride || { userId: "", companyId: "" }; // Use provided context or fallback to dummy

    try {
      // 1. Classify the user's intent (or skip if toolkits are overridden)
      const intent = requiredToolkitsOverride
        ? {
            requiredToolkits: requiredToolkitsOverride,
            complexity: "simple",
            domain: "general",
          } // Default values for complexity and domain
        : await classifyAndRouteQuery(query, history);
      console.log("Classified Intent:", intent);

      // 2. Select tools based on the classified intent.
      const requiredTools = getToolkits(intent.requiredToolkits, context);

      // 3. Dynamically select a model based on query complexity.
      const model =
        intent.complexity === "complex" || intent.complexity === "multi_step"
          ? aiConfig.powerfulChatModel || openai("gpt-4o")
          : aiConfig.chatModel || openai("gpt-4o-mini");

      // 4. Instantiate the core agent with the necessary tools and model.
      const agent = new BaseAIAgent(
        `agent-for-${context.conversationId || "default"}`,
        intent.domain, // The agent's role is now the domain from the router
        requiredTools,
        model,
      );

      // 5. Execute the query using the modernized agent core.
      const result = await agent.processQuery(
        query,
        context,
        history,
        systemPromptOverride,
      );

      console.log(`Orchestration completed in ${Date.now() - startTime}ms`);

      return result;
    } catch (error) {
      console.error("Orchestration error:", error);
      return {
        text: "I encountered an error during orchestration. Please try again or contact support.",
        toolCalls: [],
        toolResults: [],
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime: Date.now() - startTime,
        },
      };
    }
  }
}

export const agentOrchestrator = AgentOrchestrator.getInstance();
