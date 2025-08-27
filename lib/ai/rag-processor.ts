import { generateText, generateObject } from "ai";
import { aiConfig } from "./config";
import {
  contextAssemblyService,
  RAGContext,
  AssembledContext,
} from "./context-assembly";
import { z } from 'zod/v3';

export interface RAGQuery {
  query: string;
  companyId: string;
  userId: string;
  boardId?: string;
  taskId?: string;
  contextType?:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation";
  options?: {
    includeContext?: boolean;
    maxOutputTokens?: number;
    temperature?: number;
    includeSources?: boolean;
  };
}

export interface RAGResponse {
  response: string;
  confidence: number;
  sources: Array<{
    taskId: string;
    title: string;
    relevance: number;
    boardName: string;
  }>;
  contextSummary: string;
  suggestedActions?: Array<{
    type: "task" | "assignment" | "priority" | "schedule";
    description: string;
    reasoningText: string;
  }>;
  queryClassification: string;
  processingTime: number;
}

export class RAGProcessor {
  /**
   * Classify query to determine the best approach
   */
  private async classifyQuery(query: string): Promise<{
    type: "general" | "task_specific" | "board_analysis" | "recommendation";
    confidence: number;
    reasoningText: string;
  }> {
    const classificationPrompt = `Classify this project management query into one of these categories:
- general: General questions about tasks, projects, or project management
- task_specific: Questions about specific tasks, task details, or task-related actions  
- board_analysis: Questions about project health, progress, team performance, or analytics
- recommendation: Requests for suggestions, recommendations, or optimization advice

Query: "${query}"

Respond with the category name and confidence (0-1).`;

    try {
      const result = await generateObject({
        model: aiConfig.structuredOutputModel,
        system:
          "You are a query classification expert. Analyze queries and categorize them accurately.",
        prompt: classificationPrompt,
        schema: z.object({
          type: z.enum([
            "general",
            "task_specific",
            "board_analysis",
            "recommendation",
          ]),
          confidence: z.number().min(0).max(1),
          reasoningText: z.string(),
        }),
        temperature: 0.1, // Low temperature for consistent classification
      });

      return result.object;
    } catch (error) {
      console.error("Query classification error:", error);
      // Fallback to general classification
      return {
        type: "general",
        confidence: 0.5,
        reasoningText: "Fallback classification due to processing error",
      };
    }
  }

  /**
   * Process RAG query and generate response
   */
  async processQuery(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Classify the query
      const classification = await this.classifyQuery(ragQuery.query);

      // Step 2: Determine context type
      const contextType = ragQuery.contextType || classification.type;

      // Step 3: Assemble context
      const ragContext: RAGContext = {
        query: ragQuery.query,
        companyId: ragQuery.companyId,
        userId: ragQuery.userId,
        boardId: ragQuery.boardId,
        taskId: ragQuery.taskId,
        contextType,
        maxOutputTokens: ragQuery.options?.maxOutputTokens || 8000,
      };

      const assembledContext =
        await contextAssemblyService.assembleContext(ragContext);

      // Step 4: Generate response
      const response = await this.generateResponse(assembledContext, ragQuery);

      // Step 5: Extract sources
      const sources = assembledContext.contextDocuments
        .slice(0, 5) // Top 5 sources
        .map((doc) => ({
          taskId: doc.id,
          title: doc.task?.title || "Unknown task",
          relevance: Math.round(doc.similarity * 100) / 100,
          boardName: doc.task?.boardName || "Unknown board",
        }));

      // Step 6: Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        ragQuery.query,
        assembledContext.contextDocuments,
        contextType
      );

      const processingTime = Date.now() - startTime;

      return {
        response: response.text,
        confidence: assembledContext.relevanceScore,
        sources,
        contextSummary: assembledContext.contextSummary,
        suggestedActions,
        queryClassification: classification.type,
        processingTime,
      };
    } catch (error) {
      console.error("RAG processing error:", error);

      const processingTime = Date.now() - startTime;

      return {
        response:
          "I apologize, but I encountered an error while processing your query. Please try rephrasing your question or contact support if the issue persists.",
        confidence: 0,
        sources: [],
        contextSummary: "Error occurred during context retrieval",
        suggestedActions: [],
        queryClassification: "error",
        processingTime,
      };
    }
  }

  /**
   * Generate the main response using assembled context
   */
  private async generateResponse(
    context: AssembledContext,
    ragQuery: RAGQuery
  ) {
    const options = ragQuery.options || {};

    return await generateText({
      model: aiConfig.chatModel,
      system: context.systemPrompt,
      prompt: context.userPrompt,
      temperature: options.temperature || 0.7,
    });
  }

  /**
   * Generate suggested actions based on context
   */
  private async generateSuggestedActions(
    query: string,
    contextDocs: Array<{
      task?: { title: string; status: string; priority: string };
      similarity: number;
    }>,
    contextType: string
  ): Promise<
    Array<{
      type: "task" | "assignment" | "priority" | "schedule";
      description: string;
      reasoningText: string;
    }>
  > {
    if (contextDocs.length === 0) return [];

    try {
      const result = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are an AI assistant that suggests actionable next steps for project management queries.
        
Based on the query type "${contextType}" and the context provided, suggest 1-3 specific actions that would be helpful.`,
        prompt: `Query: "${query}"

Available context: ${contextDocs.length} relevant tasks found.

Generate actionable suggestions that would help address this query.`,
        schema: z.object({
          suggestions: z
            .array(
              z.object({
                type: z.enum(["task", "assignment", "priority", "schedule"]),
                description: z.string(),
                reasoningText: z.string(),
              })
            )
            .max(3),
        }),
        temperature: 0.6,
      });

      return result.object.suggestions;
    } catch (error) {
      console.error("Suggested actions generation error:", error);
      return [];
    }
  }

  /**
   * Batch process multiple queries
   */
  async processQueries(queries: RAGQuery[]): Promise<RAGResponse[]> {
    // Process queries in parallel but with limited concurrency
    const batchSize = 3;
    const results: RAGResponse[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((query) => this.processQuery(query))
      );
      results.push(...batchResults);

      // Small delay between batches to manage API rate limits
      if (i + batchSize < queries.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalQueries: number;
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
  } {
    // This would typically be implemented with proper metrics collection
    return {
      totalQueries: 0,
      averageProcessingTime: 0,
      successRate: 1.0,
      errorRate: 0.0,
    };
  }

  /**
   * Health check for RAG processor
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    chatModelAvailable: boolean;
    contextAssemblyHealthy: boolean;
    error?: string;
  }> {
    try {
      // Test chat model availability
      await generateText({
        model: aiConfig.chatModel,
        prompt: "Hello, this is a health check.",
      });

      // Test context assembly
      const contextHealth = await contextAssemblyService.healthCheck();

      return {
        healthy: contextHealth.healthy,
        chatModelAvailable: true,
        contextAssemblyHealthy: contextHealth.healthy,
      };
    } catch (error) {
      return {
        healthy: false,
        chatModelAvailable: false,
        contextAssemblyHealthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Stream response generation for real-time UI
   */
  async *streamResponse(ragQuery: RAGQuery): AsyncGenerator<{
    type: "context" | "response" | "sources" | "actions" | "complete";
    data: unknown;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Yield context assembly progress
      yield { type: "context", data: { status: "assembling_context" } };

      const classification = await this.classifyQuery(ragQuery.query);
      const contextType = ragQuery.contextType || classification.type;

      const ragContext: RAGContext = {
        query: ragQuery.query,
        companyId: ragQuery.companyId,
        userId: ragQuery.userId,
        boardId: ragQuery.boardId,
        taskId: ragQuery.taskId,
        contextType,
        maxOutputTokens: ragQuery.options?.maxOutputTokens || 8000,
      };

      const assembledContext =
        await contextAssemblyService.assembleContext(ragContext);

      yield {
        type: "context",
        data: {
          status: "context_ready",
          summary: assembledContext.contextSummary,
          relevance: assembledContext.relevanceScore,
        },
      };

      // Step 2: Yield sources
      const sources = assembledContext.contextDocuments
        .slice(0, 5)
        .map((doc) => ({
          taskId: doc.id,
          title: doc.task?.title || "Unknown task",
          relevance: Math.round(doc.similarity * 100) / 100,
          boardName: doc.task?.boardName || "Unknown board",
        }));

      yield { type: "sources", data: sources };

      // Step 3: Generate and yield response
      const response = await this.generateResponse(assembledContext, ragQuery);

      yield { type: "response", data: { text: response.text } };

      // Step 4: Generate and yield suggested actions
      const suggestedActions = await this.generateSuggestedActions(
        ragQuery.query,
        assembledContext.contextDocuments,
        contextType
      );

      yield { type: "actions", data: suggestedActions };

      // Step 5: Complete
      const processingTime = Date.now() - startTime;
      yield {
        type: "complete",
        data: {
          processingTime,
          classification: classification.type,
          confidence: assembledContext.relevanceScore,
        },
      };
    } catch (error) {
      console.error("RAG streaming error:", error);
      yield {
        type: "complete",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          processingTime: Date.now() - startTime,
        },
      };
    }
  }
}

export const ragProcessor = new RAGProcessor();
