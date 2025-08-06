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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    }
  ): void {
    const [operation] = operationId.split("-");
    const operationMetrics = this.metrics.get(operation) || [];

    const metric = operationMetrics.find((m) =>
      operationId.includes(`${m.operation}-${Math.floor(m.startTime)}`)
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
    metric: AIPerformanceMetric
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
    minutes: number = 30
  ): {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    totalCost: number;
  } {
    const operationMetrics = this.metrics.get(operation) || [];
    const cutoffTime = performance.now() - minutes * 60 * 1000;

    const recentMetrics = operationMetrics.filter(
      (m) => m.startTime >= cutoffTime
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAIMetrics<T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
