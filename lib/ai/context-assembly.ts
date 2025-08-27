import { VectorSearchResult, vectorSearchService } from "./vector-search";

export interface RAGContext {
  query: string;
  companyId: string;
  userId: string;
  boardId?: string;
  taskId?: string;
  contextType:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation";
  maxOutputTokens?: number;
}

export interface AssembledContext {
  systemPrompt: string;
  contextDocuments: VectorSearchResult[];
  userPrompt: string;
  totalTokens: number;
  relevanceScore: number;
  contextSummary: string;
}

export interface PromptTemplate {
  type:
    | "general"
    | "task_specific"
    | "board_analysis"
    | "recommendation"
    | "troubleshooting";
  systemPrompt: string;
  contextTemplate: string;
  userQueryTemplate: string;
  maxOutputTokens: number;
  requiredContext: string[];
  optionalContext: string[];
}

export class ContextAssemblyService {
  private readonly maxContextTokens = 6000; // Leave room for response
  private readonly avgTokensPerChar = 0.25; // Rough estimate

  private readonly promptTemplates: Record<string, PromptTemplate> = {
    general: {
      type: "general",
      systemPrompt: `You are an intelligent project management assistant for TaskHQ. You help users manage their tasks, analyze project progress, and make data-driven decisions.

Key capabilities:
- Search and analyze tasks across projects
- Provide project insights and recommendations
- Help with task prioritization and assignment
- Track project progress and identify bottlenecks

Always base your responses on the provided context and be specific about the data you're referencing.`,
      contextTemplate: `## Relevant Tasks and Projects

{context}

## Task Summary
- Total relevant tasks: {taskCount}
- Priority distribution: {priorityBreakdown}
- Status distribution: {statusBreakdown}
- Average relevance score: {avgRelevance}`,
      userQueryTemplate: `Based on the above context, please help me with: {query}`,
      maxOutputTokens: 8000,
      requiredContext: ["tasks"],
      optionalContext: ["boards", "users", "history"],
    },

    task_specific: {
      type: "task_specific",
      systemPrompt: `You are a task management expert helping with specific task analysis and recommendations.

Focus areas:
- Task details and context analysis
- Progress tracking and blockers
- Related tasks and dependencies
- Assignment and priority optimization

Be specific and actionable in your recommendations.`,
      contextTemplate: `## Task Context

{context}

## Related Tasks
{relatedTasks}

## Task Analytics
- Similar tasks found: {similarTaskCount}
- Context relevance: {avgRelevance}
- Board context: {boardInfo}`,
      userQueryTemplate: `Regarding the task context above: {query}`,
      maxOutputTokens: 6000,
      requiredContext: ["task", "relatedTasks"],
      optionalContext: ["board", "assignee"],
    },

    board_analysis: {
      type: "board_analysis",
      systemPrompt: `You are a project analytics specialist providing insights on project boards and team performance.

Analysis areas:
- Project health and progress tracking
- Team workload and efficiency
- Bottleneck identification
- Resource optimization recommendations
- Timeline and milestone analysis

Provide data-driven insights with specific metrics when available.`,
      contextTemplate: `## Project Board Analysis

{context}

## Board Metrics
- Total tasks: {taskCount}
- Completion rate: {completionRate}%
- Team size: {teamSize}
- Priority distribution: {priorityBreakdown}
- Status distribution: {statusBreakdown}
- Average task age: {avgTaskAge} days`,
      userQueryTemplate: `Based on the project analysis above: {query}`,
      maxOutputTokens: 10000,
      requiredContext: ["board", "tasks"],
      optionalContext: ["team", "metrics", "history"],
    },

    recommendation: {
      type: "recommendation",
      systemPrompt: `You are an AI assistant specialized in providing actionable project management recommendations.

Recommendation types:
- Task prioritization and scheduling
- Resource allocation and assignments
- Process improvements
- Risk mitigation strategies
- Performance optimization

Always provide specific, actionable recommendations with clear reasoning.`,
      contextTemplate: `## Current Project State

{context}

## Analysis Summary
- Context scope: {contextScope}
- Data points analyzed: {dataPointCount}
- Confidence level: {confidenceLevel}`,
      userQueryTemplate: `Please provide recommendations for: {query}`,
      maxOutputTokens: 8000,
      requiredContext: ["context"],
      optionalContext: ["metrics", "trends", "comparisons"],
    },

    troubleshooting: {
      type: "troubleshooting",
      systemPrompt: `You are a project troubleshooting expert helping identify and resolve project management issues.

Troubleshooting areas:
- Project bottlenecks and blockers
- Team productivity issues
- Process inefficiencies
- Resource allocation problems
- Timeline and deadline challenges

Provide root cause analysis and actionable solutions.`,
      contextTemplate: `## Problem Context

{context}

## Issue Indicators
- Related tasks: {taskCount}
- Problem scope: {problemScope}
- Affected areas: {affectedAreas}`,
      userQueryTemplate: `Please help troubleshoot this issue: {query}`,
      maxOutputTokens: 7000,
      requiredContext: ["problem_context"],
      optionalContext: ["related_tasks", "metrics", "history"],
    },
  };

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length * this.avgTokensPerChar);
  }

  /**
   * Retrieve relevant context based on query
   */
  private async retrieveRelevantContext(
    ragContext: RAGContext
  ): Promise<VectorSearchResult[]> {
    const searchQuery = {
      query: ragContext.query,
      companyId: ragContext.companyId,
      userId: ragContext.userId,
      threshold: 0.6,
      limit: 20,
      filters: ragContext.boardId
        ? { boardIds: [ragContext.boardId] }
        : undefined,
    };

    try {
      // Use hybrid search for better results
      return await vectorSearchService.hybridSearch(searchQuery, 0.7, 0.3);
    } catch (error) {
      console.error("Context retrieval error:", error);
      // Fallback to empty context
      return [];
    }
  }

  /**
   * Calculate relevance score for context documents
   */
  private calculateContextRelevance(documents: VectorSearchResult[]): number {
    if (documents.length === 0) return 0;

    const avgSimilarity =
      documents.reduce((sum, doc) => sum + doc.similarity, 0) /
      documents.length;
    const diversityBonus = Math.min(documents.length / 10, 0.1); // Bonus for diverse results

    return Math.min(avgSimilarity + diversityBonus, 1);
  }

  /**
   * Build context summary statistics
   */
  private buildContextSummary(documents: VectorSearchResult[]): {
    taskCount: number;
    priorityBreakdown: string;
    statusBreakdown: string;
    avgRelevance: string;
    boardInfo: string;
    completionRate?: string;
    teamSize?: string;
    avgTaskAge?: string;
  } {
    const priorityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const boards = new Set<string>();
    const assignees = new Set<string>();

    let totalAge = 0;
    let completedTasks = 0;

    documents.forEach((doc) => {
      if (doc.task) {
        priorityCounts[doc.task.priority] =
          (priorityCounts[doc.task.priority] || 0) + 1;
        statusCounts[doc.task.status] =
          (statusCounts[doc.task.status] || 0) + 1;
        boards.add(doc.task.boardName);
        assignees.add(doc.task.assignedToName);

        // Calculate task age in days
        const age =
          (Date.now() - doc.task.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        totalAge += age;

        if (doc.task.status === "COMPLETED") {
          completedTasks++;
        }
      }
    });

    const avgRelevance =
      documents.length > 0
        ? documents.reduce((sum, doc) => sum + doc.similarity, 0) /
          documents.length
        : 0;

    const avgTaskAge = documents.length > 0 ? totalAge / documents.length : 0;
    const completionRate =
      documents.length > 0 ? (completedTasks / documents.length) * 100 : 0;

    return {
      taskCount: documents.length,
      priorityBreakdown:
        Object.entries(priorityCounts)
          .map(([priority, count]) => `${priority}: ${count}`)
          .join(", ") || "None",
      statusBreakdown:
        Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(", ") || "None",
      avgRelevance: (avgRelevance * 100).toFixed(1) + "%",
      boardInfo: Array.from(boards).join(", ") || "No boards",
      completionRate: completionRate.toFixed(1) + "%",
      teamSize: assignees.size.toString(),
      avgTaskAge: avgTaskAge.toFixed(1),
    };
  }

  /**
   * Format context documents for inclusion in prompt
   */
  private formatContextDocuments(documents: VectorSearchResult[]): string {
    if (documents.length === 0) {
      return "No relevant tasks found in the current context.";
    }

    return documents
      .slice(0, 10) // Limit to top 10 most relevant
      .map((doc, index) => {
        const task = doc.task;
        if (!task)
          return `${index + 1}. ${doc.content} (Relevance: ${(
            doc.similarity * 100
          ).toFixed(1)}%)`;

        return `${index + 1}. **${task.title}** [${task.priority}] [${
          task.status
        }]
   Board: ${task.boardName} → ${task.sectionName}
   Assigned: ${task.assignedToName}
   Due: ${task.dueDate.toLocaleDateString()}
   Description: ${task.description || "No description"}
   Relevance: ${(doc.similarity * 100).toFixed(1)}%
   ---`;
      })
      .join("\n\n");
  }

  /**
   * Trim context to fit within token limits
   */
  private trimContextToFit(
    documents: VectorSearchResult[],
    template: PromptTemplate,
    query: string
  ): { documents: VectorSearchResult[]; estimatedTokens: number } {
    const basePromptTokens = this.estimateTokenCount(
      template.systemPrompt +
        template.userQueryTemplate.replace("{query}", query)
    );
    const availableTokens = template.maxOutputTokens - basePromptTokens - 500; // Buffer for response

    let totalTokens = 0;
    const trimmedDocs: VectorSearchResult[] = [];

    for (const doc of documents) {
      const docTokens = this.estimateTokenCount(this.formatSingleDocument(doc));

      if (totalTokens + docTokens <= availableTokens) {
        trimmedDocs.push(doc);
        totalTokens += docTokens;
      } else {
        break;
      }
    }

    return {
      documents: trimmedDocs,
      estimatedTokens: totalTokens + basePromptTokens,
    };
  }

  /**
   * Format a single document for token estimation
   */
  private formatSingleDocument(doc: VectorSearchResult): string {
    if (!doc.task) return doc.content;

    return `**${doc.task.title}** [${doc.task.priority}] [${doc.task.status}]
Board: ${doc.task.boardName} → ${doc.task.sectionName}
Assigned: ${doc.task.assignedToName}
Description: ${doc.task.description || "No description"}`;
  }

  /**
   * Assemble complete context for RAG query
   */
  async assembleContext(ragContext: RAGContext): Promise<AssembledContext> {
    const template =
      this.promptTemplates[ragContext.contextType] ||
      this.promptTemplates.general;

    // Retrieve relevant documents
    const allDocuments = await this.retrieveRelevantContext(ragContext);

    // Trim to fit token limits
    const { documents, estimatedTokens } = this.trimContextToFit(
      allDocuments,
      template,
      ragContext.query
    );

    // Build context summary
    const summary = this.buildContextSummary(documents);

    // Format context documents
    const formattedContext = this.formatContextDocuments(documents);

    // Build complete context template
    const contextTemplate = template.contextTemplate
      .replace("{context}", formattedContext)
      .replace("{taskCount}", summary.taskCount.toString())
      .replace("{priorityBreakdown}", summary.priorityBreakdown)
      .replace("{statusBreakdown}", summary.statusBreakdown)
      .replace("{avgRelevance}", summary.avgRelevance)
      .replace("{boardInfo}", summary.boardInfo)
      .replace("{completionRate}", summary.completionRate || "N/A")
      .replace("{teamSize}", summary.teamSize || "N/A")
      .replace("{avgTaskAge}", summary.avgTaskAge || "N/A")
      .replace("{similarTaskCount}", summary.taskCount.toString())
      .replace("{relatedTasks}", formattedContext)
      .replace("{contextScope}", `${summary.taskCount} tasks`)
      .replace("{dataPointCount}", summary.taskCount.toString())
      .replace("{confidenceLevel}", summary.avgRelevance)
      .replace("{problemScope}", `${summary.taskCount} related items`)
      .replace("{affectedAreas}", summary.boardInfo);

    // Build user prompt
    const userPrompt = template.userQueryTemplate.replace(
      "{query}",
      ragContext.query
    );

    // Calculate relevance score
    const relevanceScore = this.calculateContextRelevance(documents);

    // Build context summary string
    const contextSummary = `Retrieved ${documents.length} relevant tasks with ${summary.avgRelevance} average relevance from ${summary.boardInfo}`;

    return {
      systemPrompt: template.systemPrompt + "\n\n" + contextTemplate,
      contextDocuments: documents,
      userPrompt,
      totalTokens: estimatedTokens,
      relevanceScore,
      contextSummary,
    };
  }

  /**
   * Get available prompt templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(this.promptTemplates);
  }

  /**
   * Get template details
   */
  getTemplate(type: string): PromptTemplate | undefined {
    return this.promptTemplates[type];
  }

  /**
   * Health check for context assembly
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    templatesAvailable: number;
    error?: string;
  }> {
    try {
      // Test template availability
      const templates = this.getAvailableTemplates();

      // Test basic context assembly
      const testContext: RAGContext = {
        query: "test query",
        companyId: "test-company",
        userId: "test-user",
        contextType: "general",
      };

      // This will test the vector search integration
      await this.retrieveRelevantContext(testContext);

      return {
        healthy: true,
        templatesAvailable: templates.length,
      };
    } catch (error) {
      return {
        healthy: false,
        templatesAvailable: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const contextAssemblyService = new ContextAssemblyService();
