import { AgentContext } from "./agent-core";
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
  private performanceMetrics: Map<
    string,
    {
      totalQueries: number;
      avgProcessingTime: number;
      avgConfidence: number;
      successRate: number;
    }
  > = new Map();

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Select the best agent(s) for a given query
   */
  async selectAgents(
    query: string,
    context: AgentContext
  ): Promise<{
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
        system:
          "You are an expert at routing queries to the most appropriate AI agents based on their capabilities.",
        prompt: selectionPrompt,
        schema: z.object({
          primaryAgent: z.enum([
            "analyzer",
            "recommender",
            "tracker",
            "optimizer",
          ]),
          supportingAgents: z
            .array(z.enum(["analyzer", "recommender", "tracker", "optimizer"]))
            .optional(),
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
        return {
          primaryAgent: "recommender",
          reasoning: "Fallback: Query contains recommendation keywords",
        };
      }
      if (queryLower.includes("analyze") || queryLower.includes("health")) {
        return {
          primaryAgent: "analyzer",
          reasoning: "Fallback: Query contains analysis keywords",
        };
      }
      if (queryLower.includes("progress") || queryLower.includes("track")) {
        return {
          primaryAgent: "tracker",
          reasoning: "Fallback: Query contains tracking keywords",
        };
      }
      if (queryLower.includes("team") || queryLower.includes("resource")) {
        return {
          primaryAgent: "optimizer",
          reasoning: "Fallback: Query contains resource keywords",
        };
      }

      return {
        primaryAgent: "analyzer",
        reasoning: "Fallback: Default to analyzer",
      };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            processingTime:
              result.metadata.processingTime || totalProcessingTime,
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
        primaryResponse:
          "I encountered an error while processing your request. Please try again.",
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      const successfulResults = agentResults.filter((r) => r.success);

      if (successfulResults.length === 0) {
        return {
          primaryResponse:
            "I encountered errors with all agents. Please try again.",
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
        agentResponses: successfulResults.map((r) => ({
          agentRole: r.agentRole,
          response: r.response,
          confidence: r.confidence,
          processingTime: r.processingTime,
        })),
        coordinatedInsights,
        metadata: {
          agentsUsed: successfulResults.map((r) => r.agentType),
          totalProcessingTime,
          orchestrationStrategy: "multi-agent-collaborative",
        },
      };
    } catch (error) {
      console.error("Multi-agent orchestration error:", error);

      return {
        primaryResponse:
          "I encountered an error during multi-agent processing. Please try again.",
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
  .map((r) => `${r.agentRole} (confidence: ${r.confidence}): ${r.response}`)
  .join("\n\n")}

Synthesize these agent responses into a cohesive, comprehensive answer that addresses the user's query. Highlight complementary insights and resolve any conflicts between agent responses.`;

      const coordinatedResponse = await generateObject({
        model: aiConfig.chatModel,
        system:
          "You are an expert at synthesizing insights from multiple AI agents into coherent, comprehensive responses.",
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
  async orchestrate(
    request: OrchestrationRequest
  ): Promise<OrchestrationResponse> {
    const {
      query,
      context,
      preferredAgent,
      multiAgentMode = false,
      maxAgents = 3,
    } = request;

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
        return await this.processSingleAgent(
          query,
          context,
          agentSelection.primaryAgent
        );
      }
    } catch (error) {
      console.error("Orchestration error:", error);

      return {
        primaryResponse:
          "I encountered an error while processing your request. Please try again or contact support.",
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
      (current.avgProcessingTime * current.totalQueries +
        metrics.processingTime) /
      newTotal;
    const newAvgConfidence =
      (current.avgConfidence * current.totalQueries + metrics.confidence) /
      newTotal;
    const successCount =
      Math.floor(current.successRate * current.totalQueries) +
      (metrics.success ? 1 : 0);
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
  getPerformanceMetrics(): Record<
    string,
    {
      totalQueries: number;
      avgProcessingTime: number;
      avgConfidence: number;
      successRate: number;
    }
  > {
    const metrics: Record<
      string,
      {
        totalQueries: number;
        avgProcessingTime: number;
        avgConfidence: number;
        successRate: number;
      }
    > = {};

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
