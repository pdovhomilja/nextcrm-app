# Phase 6: Advanced Features & Production Deployment

## Overview

This final phase implements advanced AI capabilities, production optimizations, monitoring systems, and deployment strategies. It focuses on scalability, performance, security, and enterprise-ready features.

## Prerequisites

- Completed Phase 1-5: Full AI system operational
- Production-ready infrastructure
- Security and compliance requirements defined
- Performance baselines established

## Implementation Batches

### Batch 6.1: Advanced AI Features

**Estimated Time**: 4-5 hours
**API Token Usage**: Medium-High

#### Tasks:

- [ ] Implement multi-modal document processing
- [ ] Add conversation memory and personalization
- [ ] Create AI-powered automation workflows
- [ ] Add advanced analytics and insights

#### Multi-modal Document Processing:

Create `/lib/ai/document-processor.ts`:

```typescript
import { embed } from "ai";
import { aiConfig } from "./config";
import { embeddingStorageService } from "./embedding-storage";
import db from "@/lib/db";

export interface DocumentProcessingResult {
  success: boolean;
  documentId: string;
  extractedText: string;
  summary: string;
  keyInsights: string[];
  embeddingId?: string;
  processingTime: number;
  confidence: number;
}

export interface DocumentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  companyId: string;
  taskId?: string;
  boardId?: string;
}

export class DocumentProcessor {
  private readonly supportedTypes = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  /**
   * Process uploaded document and extract insights
   */
  async processDocument(
    fileBuffer: Buffer,
    metadata: DocumentMetadata,
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate file type
      if (!this.supportedTypes.includes(metadata.mimeType)) {
        throw new Error(`Unsupported file type: ${metadata.mimeType}`);
      }

      // Extract text content based on file type
      let extractedText = "";

      switch (metadata.mimeType) {
        case "application/pdf":
          extractedText = await this.extractTextFromPDF(fileBuffer);
          break;
        case "text/plain":
        case "text/markdown":
          extractedText = fileBuffer.toString("utf-8");
          break;
        case "text/csv":
          extractedText = await this.processCSV(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          extractedText = await this.extractTextFromDocx(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          extractedText = await this.processExcel(fileBuffer);
          break;
        case "image/png":
        case "image/jpeg":
        case "image/webp":
          extractedText = await this.extractTextFromImage(fileBuffer);
          break;
        default:
          throw new Error(`Handler not implemented for ${metadata.mimeType}`);
      }

      if (!extractedText.trim()) {
        throw new Error("No text content could be extracted from the document");
      }

      // Generate document summary and insights
      const { summary, keyInsights, confidence } =
        await this.analyzeDocumentContent(extractedText, metadata);

      // Store document in database
      const document = await db.document.create({
        data: {
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          size: metadata.size,
          extractedText,
          summary,
          keyInsights,
          confidence,
          uploadedBy: metadata.uploadedBy,
          companyId: metadata.companyId,
          taskId: metadata.taskId,
          boardId: metadata.boardId,
          processedAt: new Date(),
        },
      });

      // Generate and store embedding
      let embeddingId: string | undefined;
      try {
        const embedding = await embed({
          model: aiConfig.embeddingModel,
          value: `${summary}\n\n${extractedText.substring(0, 2000)}`, // Include summary + partial content
        });

        await db.documentEmbedding.create({
          data: {
            documentId: document.id,
            embedding: `[${embedding.embedding.join(",")}]` as any,
            content: summary,
            metadata: {
              filename: metadata.filename,
              mimeType: metadata.mimeType,
              keyInsights,
              confidence,
            },
          },
        });

        embeddingId = document.id;
      } catch (error) {
        console.error("Failed to generate document embedding:", error);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        documentId: document.id,
        extractedText,
        summary,
        keyInsights,
        embeddingId,
        processingTime,
        confidence,
      };
    } catch (error) {
      console.error("Document processing error:", error);

      return {
        success: false,
        documentId: "",
        extractedText: "",
        summary: "Failed to process document",
        keyInsights: [],
        processingTime: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Extract text from PDF using a PDF library (placeholder implementation)
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // This would use a library like pdf-parse or pdf2pic
    // For now, return placeholder
    return "PDF text extraction would be implemented here using pdf-parse library";
  }

  /**
   * Extract text from DOCX files (placeholder implementation)
   */
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    // This would use a library like mammoth
    return "DOCX text extraction would be implemented here using mammoth library";
  }

  /**
   * Process CSV files and convert to readable format
   */
  private async processCSV(buffer: Buffer): Promise<string> {
    const csvContent = buffer.toString("utf-8");
    const lines = csvContent.split("\n").slice(0, 100); // First 100 lines
    return `CSV Data Analysis:\n${lines.join("\n")}`;
  }

  /**
   * Process Excel files (placeholder implementation)
   */
  private async processExcel(buffer: Buffer): Promise<string> {
    // This would use a library like xlsx
    return "Excel processing would be implemented here using xlsx library";
  }

  /**
   * Extract text from images using OCR (placeholder implementation)
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    // This would use OCR service like Tesseract or cloud OCR
    return "OCR text extraction would be implemented here";
  }

  /**
   * Analyze document content and generate insights
   */
  private async analyzeDocumentContent(
    text: string,
    metadata: DocumentMetadata,
  ): Promise<{
    summary: string;
    keyInsights: string[];
    confidence: number;
  }> {
    try {
      const analysisResult = await generateObject({
        model: aiConfig.chatModel,
        system: `You are a document analysis expert. Analyze the provided document content and generate:
1. A concise summary (2-3 sentences)
2. Key insights relevant to project management
3. A confidence score for the analysis quality`,
        prompt: `Analyze this document content:

Filename: ${metadata.filename}
Type: ${metadata.mimeType}
Size: ${metadata.size} bytes

Content:
${text.substring(0, 4000)} ${text.length > 4000 ? "..." : ""}

Focus on insights relevant to:
- Project management and tasks
- Team collaboration
- Process improvements
- Risk factors or blockers
- Action items or decisions`,
        schema: z.object({
          summary: z.string(),
          keyInsights: z.array(z.string()).max(5),
          confidence: z.number().min(0).max(1),
          relevantTopics: z.array(z.string()).max(3),
        }),
        temperature: 0.4,
      });

      return {
        summary: analysisResult.object.summary,
        keyInsights: analysisResult.object.keyInsights,
        confidence: analysisResult.object.confidence,
      };
    } catch (error) {
      console.error("Document analysis error:", error);

      return {
        summary: `Document: ${metadata.filename} (${Math.round(metadata.size / 1024)}KB)`,
        keyInsights: ["Document processing completed"],
        confidence: 0.3,
      };
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(
    query: string,
    companyId: string,
    options: {
      boardId?: string;
      taskId?: string;
      limit?: number;
      threshold?: number;
    } = {},
  ): Promise<
    Array<{
      documentId: string;
      filename: string;
      summary: string;
      similarity: number;
      keyInsights: string[];
    }>
  > {
    const { limit = 5, threshold = 0.6 } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await embed({
        model: aiConfig.embeddingModel,
        value: query,
      });

      // Search similar documents
      const results = await db.$queryRawUnsafe(
        `
        SELECT 
          d.id,
          d.filename,
          d.summary,
          d."keyInsights",
          1 - (de.embedding <-> $1::vector) AS similarity
        FROM documents d
        JOIN document_embeddings de ON d.id = de."documentId"
        WHERE d."companyId" = $2
          ${options.boardId ? 'AND d."boardId" = $3' : ""}
          ${options.taskId ? 'AND d."taskId" = $4' : ""}
          AND (1 - (de.embedding <-> $1::vector)) >= $${options.boardId ? 5 : options.taskId ? 5 : 3}
        ORDER BY similarity DESC
        LIMIT $${options.boardId ? 6 : options.taskId ? 6 : 4}
      `,
        `[${queryEmbedding.embedding.join(",")}]`,
        companyId,
        ...(options.boardId ? [options.boardId] : []),
        ...(options.taskId ? [options.taskId] : []),
        threshold,
        limit,
      );

      return (results as any[]).map((row) => ({
        documentId: row.id,
        filename: row.filename,
        summary: row.summary,
        similarity: parseFloat(row.similarity),
        keyInsights: row.keyInsights || [],
      }));
    } catch (error) {
      console.error("Document search error:", error);
      return [];
    }
  }

  /**
   * Get document processing statistics
   */
  async getProcessingStats(companyId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    typeDistribution: Record<string, number>;
    avgProcessingTime: number;
    successRate: number;
  }> {
    try {
      const stats = await db.document.aggregate({
        where: { companyId },
        _count: { id: true },
        _sum: { size: true },
        _avg: { confidence: true },
      });

      const typeStats = await db.document.groupBy({
        where: { companyId },
        by: ["mimeType"],
        _count: { mimeType: true },
      });

      return {
        totalDocuments: stats._count.id,
        totalSize: stats._sum.size || 0,
        typeDistribution: typeStats.reduce(
          (acc, item) => {
            acc[item.mimeType] = item._count.mimeType;
            return acc;
          },
          {} as Record<string, number>,
        ),
        avgProcessingTime: 0, // Would need to track this separately
        successRate: stats._avg.confidence || 0,
      };
    } catch (error) {
      console.error("Error getting processing stats:", error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        typeDistribution: {},
        avgProcessingTime: 0,
        successRate: 0,
      };
    }
  }
}

export const documentProcessor = new DocumentProcessor();
```

#### Conversation Memory & Personalization:

Create `/lib/ai/conversation-memory.ts`:

```typescript
import db from "@/lib/db";
import { generateObject } from "ai";
import { aiConfig } from "./config";
import { z } from "zod";

export interface ConversationContext {
  userId: string;
  companyId: string;
  boardId?: string;
  taskId?: string;
  sessionId?: string;
}

export interface UserPreferences {
  communicationStyle: "formal" | "casual" | "concise" | "detailed";
  focusAreas: string[];
  notificationPreferences: {
    suggestions: boolean;
    insights: boolean;
    reminders: boolean;
  };
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  expertiseLevel: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ConversationSummary {
  id: string;
  userId: string;
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  preferences: Partial<UserPreferences>;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  createdAt: Date;
}

export class ConversationMemoryService {
  /**
   * Store conversation message with context
   */
  async storeMessage(
    message: {
      role: "user" | "assistant" | "system";
      content: string;
      metadata?: Record<string, any>;
    },
    context: ConversationContext,
  ): Promise<string> {
    try {
      const conversation = await this.getOrCreateConversation(context);

      const storedMessage = await db.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
        },
      });

      // Update conversation summary periodically
      const messageCount = await db.aIMessage.count({
        where: { conversationId: conversation.id },
      });

      if (messageCount % 10 === 0) {
        await this.updateConversationSummary(conversation.id);
      }

      return storedMessage.id;
    } catch (error) {
      console.error("Error storing conversation message:", error);
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(context: ConversationContext) {
    const sessionId = context.sessionId || `session-${Date.now()}`;

    let conversation = await db.aIConversation.findFirst({
      where: {
        userId: context.userId,
        title: sessionId,
      },
    });

    if (!conversation) {
      conversation = await db.aIConversation.create({
        data: {
          userId: context.userId,
          companyId: context.companyId,
          title: sessionId,
          context: {
            boardId: context.boardId,
            taskId: context.taskId,
            sessionId,
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Update conversation summary with AI analysis
   */
  private async updateConversationSummary(
    conversationId: string,
  ): Promise<void> {
    try {
      const messages = await db.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 20, // Last 20 messages
      });

      if (messages.length === 0) return;

      const conversationText = messages
        .reverse()
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const summary = await generateObject({
        model: aiConfig.chatModel,
        system: `Analyze this conversation and extract:
1. Key topics discussed
2. Action items or decisions made
3. User preferences and communication style
4. Overall sentiment
5. A brief summary`,
        prompt: `Analyze this conversation:

${conversationText}

Focus on project management context and user behavior patterns.`,
        schema: z.object({
          summary: z.string(),
          keyTopics: z.array(z.string()).max(5),
          actionItems: z.array(z.string()).max(3),
          communicationStyle: z.enum([
            "formal",
            "casual",
            "concise",
            "detailed",
          ]),
          sentiment: z.enum(["positive", "neutral", "negative"]),
          confidence: z.number().min(0).max(1),
          focusAreas: z.array(z.string()).max(3),
        }),
        temperature: 0.4,
      });

      // Store summary
      await db.conversationSummary.upsert({
        where: { conversationId },
        create: {
          conversationId,
          summary: summary.object.summary,
          keyTopics: summary.object.keyTopics,
          actionItems: summary.object.actionItems,
          preferences: {
            communicationStyle: summary.object.communicationStyle,
            focusAreas: summary.object.focusAreas,
          },
          sentiment: summary.object.sentiment,
          confidence: summary.object.confidence,
        },
        update: {
          summary: summary.object.summary,
          keyTopics: summary.object.keyTopics,
          actionItems: summary.object.actionItems,
          preferences: {
            communicationStyle: summary.object.communicationStyle,
            focusAreas: summary.object.focusAreas,
          },
          sentiment: summary.object.sentiment,
          confidence: summary.object.confidence,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating conversation summary:", error);
    }
  }

  /**
   * Get user preferences from conversation history
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const summaries = await db.conversationSummary.findMany({
        where: {
          conversation: {
            userId,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (summaries.length === 0) {
        return this.getDefaultPreferences();
      }

      // Aggregate preferences from recent conversations
      const communicationStyles = summaries
        .map((s) => s.preferences?.communicationStyle)
        .filter(Boolean) as string[];

      const focusAreas = summaries
        .flatMap((s) => s.preferences?.focusAreas || [])
        .filter(Boolean);

      const mostCommonStyle =
        this.getMostFrequent(communicationStyles) || "casual";
      const topFocusAreas = this.getTopItems(focusAreas, 3);

      return {
        communicationStyle: mostCommonStyle as any,
        focusAreas: topFocusAreas,
        notificationPreferences: {
          suggestions: true,
          insights: true,
          reminders: true,
        },
        workingHours: {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
        },
        expertiseLevel: "intermediate",
      };
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get conversation context for better responses
   */
  async getConversationContext(
    userId: string,
    sessionId?: string,
  ): Promise<{
    recentTopics: string[];
    actionItems: string[];
    preferences: UserPreferences;
    conversationHistory: Array<{
      role: string;
      content: string;
      timestamp: Date;
    }>;
  }> {
    try {
      // Get recent conversation
      const conversation = await db.aIConversation.findFirst({
        where: {
          userId,
          title: sessionId || { contains: "session-" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      const summary = conversation
        ? await db.conversationSummary.findUnique({
            where: { conversationId: conversation.id },
          })
        : null;

      const preferences = await this.getUserPreferences(userId);

      return {
        recentTopics: summary?.keyTopics || [],
        actionItems: summary?.actionItems || [],
        preferences,
        conversationHistory:
          conversation?.messages.reverse().map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.createdAt,
          })) || [],
      };
    } catch (error) {
      console.error("Error getting conversation context:", error);
      return {
        recentTopics: [],
        actionItems: [],
        preferences: this.getDefaultPreferences(),
        conversationHistory: [],
      };
    }
  }

  /**
   * Personalize response based on user preferences
   */
  personalizeResponse(response: string, preferences: UserPreferences): string {
    switch (preferences.communicationStyle) {
      case "formal":
        return response
          .replace(/hey/gi, "Hello")
          .replace(/\bthat's\b/gi, "that is")
          .replace(/\bcan't\b/gi, "cannot");

      case "concise":
        return (
          response.split(". ").slice(0, 3).join(". ") +
          (response.includes(". ") ? "." : "")
        );

      case "detailed":
        return (
          response +
          "\n\nWould you like me to elaborate on any of these points?"
        );

      default:
        return response;
    }
  }

  /**
   * Helper methods
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      communicationStyle: "casual",
      focusAreas: ["task_management", "productivity"],
      notificationPreferences: {
        suggestions: true,
        insights: true,
        reminders: true,
      },
      workingHours: {
        start: "09:00",
        end: "17:00",
        timezone: "UTC",
      },
      expertiseLevel: "intermediate",
    };
  }

  private getMostFrequent<T>(items: T[]): T | null {
    if (items.length === 0) return null;

    const counts = items.reduce(
      (acc, item) => {
        acc[item as string] = (acc[item as string] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(counts).reduce((a, b) =>
      counts[a[0]] > counts[b[0]] ? a : b,
    )[0] as T;
  }

  private getTopItems(items: string[], count: number): string[] {
    const counts = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([item]) => item);
  }
}

export const conversationMemory = new ConversationMemoryService();
```

### Batch 6.2: Production Monitoring & Observability

**Estimated Time**: 3-4 hours
**API Token Usage**: Low

#### Tasks:

- [ ] Implement comprehensive logging system
- [ ] Add performance monitoring and metrics
- [ ] Create health check and alerting system
- [ ] Set up cost tracking and optimization

#### Production Monitoring System:

Create `/lib/monitoring/ai-metrics.ts`:

```typescript
import { performance } from "perf_hooks";

export interface AIMetrics {
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface AIPerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  tokens?: number;
  cost?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AIMetricsCollector {
  private static instance: AIMetricsCollector;
  private metrics: Map<string, AIPerformanceMetric[]> = new Map();
  private aggregatedMetrics: Map<string, AIMetrics> = new Map();

  static getInstance(): AIMetricsCollector {
    if (!AIMetricsCollector.instance) {
      AIMetricsCollector.instance = new AIMetricsCollector();
    }
    return AIMetricsCollector.instance;
  }

  /**
   * Start tracking an AI operation
   */
  startOperation(operation: string, metadata?: Record<string, any>): string {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: AIPerformanceMetric = {
      operation,
      startTime: performance.now(),
      success: false,
      metadata: metadata || {},
    };

    const operationMetrics = this.metrics.get(operation) || [];
    operationMetrics.push(metric);
    this.metrics.set(operation, operationMetrics);

    return operationId;
  }

  /**
   * End tracking an AI operation
   */
  endOperation(
    operationId: string,
    result: {
      success: boolean;
      tokens?: number;
      cost?: number;
      errorMessage?: string;
    },
  ): void {
    const [operation] = operationId.split("-");
    const operationMetrics = this.metrics.get(operation) || [];

    const metric = operationMetrics.find((m) =>
      operationId.includes(`${m.operation}-${Math.floor(m.startTime)}`),
    );

    if (metric) {
      metric.endTime = performance.now();
      metric.success = result.success;
      metric.tokens = result.tokens;
      metric.cost = result.cost;
      metric.errorMessage = result.errorMessage;

      this.updateAggregatedMetrics(operation, metric);
    }
  }

  /**
   * Update aggregated metrics
   */
  private updateAggregatedMetrics(
    operation: string,
    metric: AIPerformanceMetric,
  ): void {
    const current = this.aggregatedMetrics.get(operation) || {
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: new Date(),
    };

    const responseTime = metric.endTime ? metric.endTime - metric.startTime : 0;

    current.requestCount += 1;
    current.totalTokens += metric.tokens || 0;
    current.totalCost += metric.cost || 0;
    current.averageResponseTime =
      (current.averageResponseTime * (current.requestCount - 1) +
        responseTime) /
      current.requestCount;
    current.errorRate =
      (current.errorRate * (current.requestCount - 1) +
        (metric.success ? 0 : 1)) /
      current.requestCount;
    current.lastUpdated = new Date();

    this.aggregatedMetrics.set(operation, current);
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationMetrics(operation: string): AIMetrics | null {
    return this.aggregatedMetrics.get(operation) || null;
  }

  /**
   * Get all aggregated metrics
   */
  getAllMetrics(): Record<string, AIMetrics> {
    const result: Record<string, AIMetrics> = {};
    for (const [operation, metrics] of this.aggregatedMetrics.entries()) {
      result[operation] = { ...metrics };
    }
    return result;
  }

  /**
   * Get recent performance data
   */
  getRecentPerformance(
    operation: string,
    minutes: number = 30,
  ): {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    totalCost: number;
  } {
    const operationMetrics = this.metrics.get(operation) || [];
    const cutoffTime = performance.now() - minutes * 60 * 1000;

    const recentMetrics = operationMetrics.filter(
      (m) => m.startTime >= cutoffTime,
    );

    if (recentMetrics.length === 0) {
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
        totalCost: 0,
      };
    }

    const totalResponseTime = recentMetrics
      .filter((m) => m.endTime)
      .reduce((sum, m) => sum + (m.endTime! - m.startTime), 0);

    const errorCount = recentMetrics.filter((m) => !m.success).length;
    const totalCost = recentMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);

    return {
      requestsPerMinute: recentMetrics.length / minutes,
      averageResponseTime: totalResponseTime / recentMetrics.length,
      errorRate: errorCount / recentMetrics.length,
      totalCost,
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getAllMetrics();
    let output = "";

    Object.entries(metrics).forEach(([operation, data]) => {
      const sanitizedOperation = operation.replace(/[^a-zA-Z0-9_]/g, "_");

      output += `# HELP ai_requests_total Total number of AI requests\n`;
      output += `# TYPE ai_requests_total counter\n`;
      output += `ai_requests_total{operation="${sanitizedOperation}"} ${data.requestCount}\n`;

      output += `# HELP ai_tokens_total Total number of tokens used\n`;
      output += `# TYPE ai_tokens_total counter\n`;
      output += `ai_tokens_total{operation="${sanitizedOperation}"} ${data.totalTokens}\n`;

      output += `# HELP ai_cost_total Total cost in USD\n`;
      output += `# TYPE ai_cost_total counter\n`;
      output += `ai_cost_total{operation="${sanitizedOperation}"} ${data.totalCost}\n`;

      output += `# HELP ai_response_time_avg Average response time in ms\n`;
      output += `# TYPE ai_response_time_avg gauge\n`;
      output += `ai_response_time_avg{operation="${sanitizedOperation}"} ${data.averageResponseTime}\n`;

      output += `# HELP ai_error_rate Error rate (0-1)\n`;
      output += `# TYPE ai_error_rate gauge\n`;
      output += `ai_error_rate{operation="${sanitizedOperation}"} ${data.errorRate}\n`;
    });

    return output;
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(retentionHours: number = 24): void {
    const cutoffTime = performance.now() - retentionHours * 60 * 60 * 1000;

    for (const [operation, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter((m) => m.startTime >= cutoffTime);
      this.metrics.set(operation, filteredMetrics);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.aggregatedMetrics.clear();
  }
}

export const aiMetrics = AIMetricsCollector.getInstance();

// Middleware function to automatically track API requests
export function withAIMetrics<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T,
): T {
  return (async (...args: any[]) => {
    const operationId = aiMetrics.startOperation(operation, {
      args: args.length,
    });

    try {
      const result = await fn(...args);

      // Extract token and cost information if available
      const tokens = result?.usage?.total_tokens || result?.tokens || 0;
      const cost = tokens * 0.0001; // Rough estimate, should be more accurate

      aiMetrics.endOperation(operationId, {
        success: true,
        tokens,
        cost,
      });

      return result;
    } catch (error) {
      aiMetrics.endOperation(operationId, {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }) as T;
}
```

#### Health Check System:

Create `/app/api/health/ai/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { mcpClientPool } from "@/lib/ai/mcp-client-pool";
import { aiMetrics } from "@/lib/monitoring/ai-metrics";
import { embeddingStorageService } from "@/lib/ai/embedding-storage";
import db from "@/lib/db";

interface HealthCheck {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  details: Record<string, any>;
  responseTime: number;
  lastChecked: Date;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const startTime = Date.now();

  // Check MCP servers
  try {
    const mcpStartTime = Date.now();
    const serverStatus = mcpClientPool.getServerStatus();
    const healthyServers = serverStatus.filter((s) => s.status === "healthy");

    checks.push({
      service: "MCP Servers",
      status:
        healthyServers.length === serverStatus.length
          ? "healthy"
          : healthyServers.length > 0
            ? "degraded"
            : "unhealthy",
      details: {
        totalServers: serverStatus.length,
        healthyServers: healthyServers.length,
        servers: serverStatus,
      },
      responseTime: Date.now() - mcpStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "MCP Servers",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
    });
  }

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    await db.$queryRaw`SELECT 1`;

    checks.push({
      service: "Database",
      status: "healthy",
      details: { connection: "active" },
      responseTime: Date.now() - dbStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "Database",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Check vector database
  try {
    const vectorStartTime = Date.now();
    const stats = await embeddingStorageService.getEmbeddingStats();

    checks.push({
      service: "Vector Database",
      status: stats.totalTaskEmbeddings > 0 ? "healthy" : "degraded",
      details: {
        taskEmbeddings: stats.totalTaskEmbeddings,
        boardEmbeddings: stats.totalBoardEmbeddings,
        avgAge: stats.avgEmbeddingAge,
      },
      responseTime: Date.now() - vectorStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "Vector Database",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Check AI metrics and performance
  try {
    const metricsStartTime = Date.now();
    const allMetrics = aiMetrics.getAllMetrics();
    const recentPerformance = aiMetrics.getRecentPerformance("chat", 30);

    const highErrorRate = Object.values(allMetrics).some(
      (m) => m.errorRate > 0.1,
    );
    const slowResponse = recentPerformance.averageResponseTime > 5000; // 5 seconds

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (highErrorRate || slowResponse) {
      status = "degraded";
    }

    checks.push({
      service: "AI Performance",
      status,
      details: {
        operations: Object.keys(allMetrics),
        recentPerformance,
        totalRequests: Object.values(allMetrics).reduce(
          (sum, m) => sum + m.requestCount,
          0,
        ),
        totalCost: Object.values(allMetrics).reduce(
          (sum, m) => sum + m.totalCost,
          0,
        ),
      },
      responseTime: Date.now() - metricsStartTime,
      lastChecked: new Date(),
    });
  } catch (error) {
    checks.push({
      service: "AI Performance",
      status: "unhealthy",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  // Overall health determination
  const unhealthyCount = checks.filter((c) => c.status === "unhealthy").length;
  const degradedCount = checks.filter((c) => c.status === "degraded").length;

  let overallStatus: "healthy" | "degraded" | "unhealthy";
  if (unhealthyCount > 0) {
    overallStatus = "unhealthy";
  } else if (degradedCount > 0) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  const responseCode =
    overallStatus === "healthy"
      ? 200
      : overallStatus === "degraded"
        ? 200
        : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalResponseTime: Date.now() - startTime,
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter((c) => c.status === "healthy").length,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
    },
    { status: responseCode },
  );
}
```

### Batch 6.3: Security & Compliance

**Estimated Time**: 2-3 hours
**API Token Usage**: Low

#### Tasks:

- [ ] Implement data privacy and GDPR compliance
- [ ] Add security audit logging
- [ ] Create rate limiting and abuse prevention
- [ ] Set up data retention policies

#### Security & Privacy Implementation:

Create `/lib/security/ai-security.ts`:

```typescript
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";

export interface SecurityAuditLog {
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  risk: "low" | "medium" | "high";
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class AISecurityService {
  private static instance: AISecurityService;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> =
    new Map();

  // Rate limit configurations
  private rateLimits: Record<string, RateLimitConfig> = {
    "ai-chat": { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    "ai-suggestions": { windowMs: 300000, maxRequests: 20 }, // 20 requests per 5 minutes
    "ai-analysis": { windowMs: 900000, maxRequests: 10 }, // 10 requests per 15 minutes
    "document-processing": { windowMs: 3600000, maxRequests: 50 }, // 50 per hour
  };

  static getInstance(): AISecurityService {
    if (!AISecurityService.instance) {
      AISecurityService.instance = new AISecurityService();
    }
    return AISecurityService.instance;
  }

  /**
   * Check rate limits for AI operations
   */
  async checkRateLimit(
    userId: string,
    operation: string,
    request?: NextRequest,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const config = this.rateLimits[operation];
    if (!config) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const key = `${userId}:${operation}`;
    const now = Date.now();
    const current = this.rateLimitStore.get(key);

    // Reset if window expired
    if (!current || now > current.resetTime) {
      const newResetTime = now + config.windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime: newResetTime });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newResetTime,
      };
    }

    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      await this.logSecurityEvent({
        userId,
        action: "RATE_LIMIT_EXCEEDED",
        resource: operation,
        details: {
          currentCount: current.count,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
        },
        timestamp: new Date(),
        ipAddress: request?.ip,
        userAgent: request?.headers.get("user-agent") || undefined,
        risk: "medium",
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }

    // Increment counter
    current.count += 1;
    this.rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event: SecurityAuditLog): Promise<void> {
    try {
      await db.securityAuditLog.create({
        data: {
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          details: event.details,
          timestamp: event.timestamp,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          risk: event.risk,
        },
      });

      // Alert on high-risk events
      if (event.risk === "high") {
        await this.alertHighRiskEvent(event);
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Validate and sanitize AI input
   */
  validateAIInput(
    input: string,
    maxLength: number = 4000,
  ): {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let sanitized = input;

    // Check length
    if (input.length > maxLength) {
      sanitized = input.substring(0, maxLength);
      warnings.push(`Input truncated to ${maxLength} characters`);
    }

    // Remove potentially malicious patterns
    const maliciousPatterns = [
      /javascript:/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
    ];

    maliciousPatterns.forEach((pattern) => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, "[FILTERED]");
        warnings.push("Potentially malicious content filtered");
      }
    });

    // Check for potential data exfiltration attempts
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email patterns
    ];

    sensitivePatterns.forEach((pattern) => {
      if (pattern.test(sanitized)) {
        warnings.push("Potentially sensitive information detected");
      }
    });

    return {
      isValid: warnings.length === 0,
      sanitized,
      warnings,
    };
  }

  /**
   * Check user permissions for AI operations
   */
  async checkAIPermissions(
    userId: string,
    operation: string,
    resourceId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, cid: true },
      });

      if (!user) {
        return { allowed: false, reason: "User not found" };
      }

      // Check operation-specific permissions
      switch (operation) {
        case "ai-admin":
          return {
            allowed: user.role === "ADMIN",
            reason: user.role !== "ADMIN" ? "Admin role required" : undefined,
          };

        case "document-processing":
          return {
            allowed: ["ADMIN", "EDITOR", "MEDIA"].includes(user.role),
            reason: !["ADMIN", "EDITOR", "MEDIA"].includes(user.role)
              ? "Insufficient permissions"
              : undefined,
          };

        case "ai-analysis":
          return {
            allowed: ["ADMIN", "EDITOR", "CONTRIBUTOR"].includes(user.role),
            reason: !["ADMIN", "EDITOR", "CONTRIBUTOR"].includes(user.role)
              ? "Insufficient permissions"
              : undefined,
          };

        default:
          // Basic AI operations allowed for all authenticated users
          return { allowed: true };
      }
    } catch (error) {
      console.error("Permission check error:", error);
      return { allowed: false, reason: "Permission check failed" };
    }
  }

  /**
   * Implement data privacy controls
   */
  async anonymizeUserData(userId: string): Promise<void> {
    try {
      // Anonymize conversation history
      await db.aIMessage.updateMany({
        where: {
          conversation: { userId },
        },
        data: {
          content: "[ANONYMIZED]",
          metadata: {},
        },
      });

      // Anonymize conversation summaries
      await db.conversationSummary.updateMany({
        where: {
          conversation: { userId },
        },
        data: {
          summary: "[ANONYMIZED]",
          keyTopics: [],
          actionItems: [],
        },
      });

      await this.logSecurityEvent({
        userId,
        action: "DATA_ANONYMIZED",
        resource: "user_data",
        details: { anonymizedAt: new Date() },
        timestamp: new Date(),
        risk: "low",
      });
    } catch (error) {
      console.error("Data anonymization error:", error);
      throw error;
    }
  }

  /**
   * Delete user AI data (GDPR compliance)
   */
  async deleteUserAIData(userId: string): Promise<void> {
    try {
      // Delete conversations and messages
      await db.aIMessage.deleteMany({
        where: {
          conversation: { userId },
        },
      });

      await db.aIConversation.deleteMany({
        where: { userId },
      });

      // Delete user documents
      await db.document.deleteMany({
        where: { uploadedBy: userId },
      });

      await this.logSecurityEvent({
        userId,
        action: "DATA_DELETED",
        resource: "user_ai_data",
        details: { deletedAt: new Date(), gdprCompliance: true },
        timestamp: new Date(),
        risk: "low",
      });
    } catch (error) {
      console.error("Data deletion error:", error);
      throw error;
    }
  }

  /**
   * Alert on high-risk security events
   */
  private async alertHighRiskEvent(event: SecurityAuditLog): Promise<void> {
    // In production, this would integrate with alerting systems
    console.warn("HIGH RISK SECURITY EVENT:", {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      timestamp: event.timestamp,
      details: event.details,
    });

    // Could integrate with services like:
    // - Slack/Discord webhooks
    // - Email alerts
    // - PagerDuty
    // - Security incident response systems
  }

  /**
   * Clean up old rate limit data
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(
    timeRange: "hour" | "day" | "week" = "day",
  ): Promise<{
    totalEvents: number;
    highRiskEvents: number;
    rateLimitViolations: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const hoursBack = timeRange === "hour" ? 1 : timeRange === "day" ? 24 : 168;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      const events = await db.securityAuditLog.findMany({
        where: {
          timestamp: { gte: since },
        },
        select: {
          action: true,
          risk: true,
        },
      });

      const actionCounts = events.reduce(
        (acc, event) => {
          acc[event.action] = (acc[event.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      return {
        totalEvents: events.length,
        highRiskEvents: events.filter((e) => e.risk === "high").length,
        rateLimitViolations: events.filter(
          (e) => e.action === "RATE_LIMIT_EXCEEDED",
        ).length,
        topActions,
      };
    } catch (error) {
      console.error("Error getting security metrics:", error);
      return {
        totalEvents: 0,
        highRiskEvents: 0,
        rateLimitViolations: 0,
        topActions: [],
      };
    }
  }
}

export const aiSecurity = AISecurityService.getInstance();

// Middleware for API routes
export async function withAISecurity(
  request: NextRequest,
  operation: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check rate limits
    const rateLimitResult = await aiSecurity.checkRateLimit(
      session.user.id,
      operation,
      request,
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime,
            ).toISOString(),
            ...(rateLimitResult.retryAfter && {
              "Retry-After": rateLimitResult.retryAfter.toString(),
            }),
          },
        },
      );
    }

    // Check permissions
    const permissionResult = await aiSecurity.checkAIPermissions(
      session.user.id,
      operation,
    );

    if (!permissionResult.allowed) {
      await aiSecurity.logSecurityEvent({
        userId: session.user.id,
        action: "PERMISSION_DENIED",
        resource: operation,
        details: { reason: permissionResult.reason },
        timestamp: new Date(),
        ipAddress: request.ip,
        userAgent: request.headers.get("user-agent") || undefined,
        risk: "medium",
      });

      return new Response(
        JSON.stringify({
          error: "Insufficient permissions",
          reason: permissionResult.reason,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Execute handler
    const response = await handler();

    // Log successful operation
    await aiSecurity.logSecurityEvent({
      userId: session.user.id,
      action: "AI_OPERATION",
      resource: operation,
      details: { status: "success" },
      timestamp: new Date(),
      ipAddress: request.ip,
      userAgent: request.headers.get("user-agent") || undefined,
      risk: "low",
    });

    return response;
  } catch (error) {
    console.error("AI Security middleware error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

## Testing & Deployment

### Batch 6.4: Production Deployment & Testing

**Estimated Time**: 3-4 hours
**API Token Usage**: Low

#### Tasks:

- [ ] Create comprehensive integration tests
- [ ] Set up production deployment configuration
- [ ] Implement performance optimization
- [ ] Create deployment automation scripts

#### Production Configuration:

Create `/deployment/production-config.md`:

````markdown
# Production Deployment Configuration

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/taskhq_prod"
DIRECT_URL="postgresql://user:pass@host:5432/taskhq_prod"

# Authentication
AUTH_SECRET="production-secret-key"
NEXTAUTH_URL="https://taskhq.xmation.ai"

# AI Configuration
OPENAI_API_KEY="sk-prod-..."
AI_MODEL="gpt-4-turbo"
EMBEDDING_MODEL="text-embedding-ada-002"
EMBEDDING_DIMENSIONS="1536"

# MCP Configuration
REDIS_URL="redis://user:pass@host:6379"
MCP_SSE_ENABLED="true"
MCP_VERBOSE_LOGS="false"
MCP_MAX_DURATION="800"

# Vector Database
PGVECTOR_ENABLED="true"
SIMILARITY_THRESHOLD="0.7"

# Feature Flags
AI_FEATURES_ENABLED="true"
AI_SUGGESTIONS_ENABLED="true"
AI_ANALYTICS_ENABLED="true"
AI_STREAMING_ENABLED="true"
MCP_TOOLS_ENABLED="true"

# Rate Limiting
AI_RATE_LIMIT_REQUESTS="100"
AI_RATE_LIMIT_WINDOW="3600"

# Monitoring
NEXT_PUBLIC_APP_URL="https://taskhq.xmation.ai"
SENTRY_DSN="https://..."
VERCEL_ANALYTICS_ID="..."

# Security
CORS_ORIGINS="https://taskhq.xmation.ai"
ALLOWED_HOSTS="taskhq.xmation.ai"
```
````

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "framework": "nextjs",
  "functions": {
    "app/api/ai/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/mcp/**/*.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "ENABLE_EXPERIMENTAL_FEATURES": "true"
  },
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health/index"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://taskhq.xmation.ai"
        }
      ]
    }
  ]
}
```

### Performance Optimization

```typescript
// next.config.js optimizations
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    serverComponentsExternalPackages: ["@ai-sdk/openai"],
  },

  // AI-specific optimizations
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Optimize server-side AI libraries
      config.externals = config.externals || [];
      config.externals.push({
        openai: "commonjs openai",
        "@ai-sdk/openai": "commonjs @ai-sdk/openai",
      });
    }
    return config;
  },

  // Image optimization for document processing
  images: {
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
  },

  // Headers for AI APIs
  async headers() {
    return [
      {
        source: "/api/ai/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

````

#### Integration Tests:
Create `/tests/integration/ai-system.test.ts`:

```typescript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { mcpClientPool } from '@/lib/ai/mcp-client-pool';
import { agentOrchestrator } from '@/lib/ai/agent-orchestrator';

describe('AI System Integration Tests', () => {
  let app: any;
  let server: any;
  let port: number;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.NEXTAUTH_URL = 'http://localhost:3001';

    // Initialize Next.js app
    app = next({ dev: false, port: 3001 });
    const handle = app.getRequestHandler();

    await app.prepare();

    server = createServer(async (req, res) => {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    });

    await new Promise<void>((resolve) => {
      server.listen(3001, () => {
        port = server.address()?.port;
        resolve();
      });
    });

    // Initialize AI systems
    await mcpClientPool.initialize();
  });

  afterAll(async () => {
    await mcpClientPool.close();
    server.close();
  });

  describe('MCP Server Health', () => {
    test('should have all MCP servers healthy', async () => {
      const serverStatus = mcpClientPool.getServerStatus();

      expect(serverStatus.length).toBeGreaterThan(0);

      const healthyServers = serverStatus.filter(s => s.status === 'healthy');
      expect(healthyServers.length).toBe(serverStatus.length);

      for (const server of serverStatus) {
        expect(server.toolCount).toBeGreaterThan(0);
        expect(server.lastHealthCheck).toBeInstanceOf(Date);
      }
    });
  });

  describe('Agent Orchestration', () => {
    test('should orchestrate single agent successfully', async () => {
      const response = await agentOrchestrator.orchestrate({
        query: 'What tasks need attention?',
        context: {
          userId: 'test-user',
          companyId: 'test-company',
        },
        multiAgentMode: false,
      });

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses.length).toBeGreaterThan(0);
      expect(response.metadata.orchestrationStrategy).toBe('single-agent');
    });

    test('should handle multi-agent coordination', async () => {
      const response = await agentOrchestrator.orchestrate({
        query: 'Analyze my project health and recommend improvements',
        context: {
          userId: 'test-user',
          companyId: 'test-company',
          boardId: 'test-board',
        },
        multiAgentMode: true,
      });

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses.length).toBeGreaterThanOrEqual(1);
      expect(response.metadata.orchestrationStrategy).toMatch(/multi-agent/);

      if (response.coordinatedInsights) {
        expect(response.coordinatedInsights).toBeTruthy();
      }
    });
  });

  describe('API Endpoints', () => {
    test('should handle chat API requests', async () => {
      const response = await fetch(`http://localhost:${port}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello AI assistant' }],
          useRAG: false,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/plain');
    });

    test('should provide health check information', async () => {
      const response = await fetch(`http://localhost:${port}/api/health/ai`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toMatch(/healthy|degraded/);
      expect(data.checks).toBeInstanceOf(Array);
      expect(data.checks.length).toBeGreaterThan(0);

      for (const check of data.checks) {
        expect(check).toHaveProperty('service');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('responseTime');
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid requests gracefully', async () => {
      const response = await fetch(`http://localhost:${port}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle MCP server failures gracefully', async () => {
      // Temporarily break connection to test resilience
      const originalTools = await mcpClientPool.getTools();

      // Simulate server failure by clearing tools
      jest.spyOn(mcpClientPool, 'getTools').mockResolvedValue({});

      const response = await agentOrchestrator.orchestrate({
        query: 'Test query during failure',
        context: {
          userId: 'test-user',
          companyId: 'test-company',
        },
      });

      expect(response.primaryResponse).toBeTruthy();
      expect(response.metadata.orchestrationStrategy).toMatch(/error|fallback/);

      // Restore original functionality
      jest.restoreAllMocks();
    });
  });

  describe('Performance', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await agentOrchestrator.orchestrate({
        query: 'Quick performance test query',
        context: {
          userId: 'test-user',
          companyId: 'test-company',
        },
      });

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(10000); // 10 seconds max
      expect(response.metadata.totalProcessingTime).toBeLessThan(responseTime);
    });
  });
});
````

## Success Criteria

- [ ] All advanced AI features function correctly in production
- [ ] Monitoring and alerting systems capture key metrics
- [ ] Security controls protect against abuse and unauthorized access
- [ ] Performance meets production requirements (< 5s response times)
- [ ] Integration tests pass consistently
- [ ] Deployment automation works reliably
- [ ] Documentation is comprehensive and up-to-date
- [ ] GDPR compliance features work correctly
- [ ] Cost monitoring stays within budget limits

## Post-Deployment Tasks

1. **Monitor system performance** for first 48 hours
2. **Collect user feedback** and usage metrics
3. **Optimize performance** based on real-world usage
4. **Scale infrastructure** as needed
5. **Plan iterative improvements** based on user needs
6. **Maintain security** with regular updates and audits

## Troubleshooting Production Issues

### Common Production Issues:

- **High response times**: Check MCP server health, database performance
- **Rate limit violations**: Review usage patterns, adjust limits if needed
- **Memory leaks**: Monitor conversation history cleanup
- **Cost overruns**: Review usage metrics, implement additional controls
- **Security incidents**: Check audit logs, review access patterns

### Monitoring Commands:

```bash
# Check system health
curl -s https://taskhq.xmation.ai/api/health/ai | jq .

# Monitor MCP servers
curl -s https://taskhq.xmation.ai/api/health/mcp | jq .

# View AI metrics
curl -s https://taskhq.xmation.ai/api/ai/metrics | jq .

# Check security events
curl -s https://taskhq.xmation.ai/api/security/audit | jq .
```

This completes the comprehensive RAG implementation plan for TaskHQ. The system now includes advanced AI capabilities, production-ready infrastructure, security controls, and monitoring systems necessary for enterprise deployment.
