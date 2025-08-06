export class EmbeddingMonitor {
  private static requests = 0;
  private static costs = 0;
  private static errors = 0;
  private static startTime = Date.now();

  static trackRequest(tokenCount: number): void {
    this.requests++;
    // OpenAI embedding cost: $0.0001 per 1K tokens
    this.costs += (tokenCount / 1000) * 0.0001;
  }

  static trackError(): void {
    this.errors++;
  }

  static getStats(): {
    requests: number;
    costs: number;
    errors: number;
    errorRate: number;
    uptime: number;
    requestsPerHour: number;
    averageCostPerRequest: number;
  } {
    const uptime = Date.now() - this.startTime;
    const hours = uptime / (1000 * 60 * 60);

    return {
      requests: this.requests,
      costs: parseFloat(this.costs.toFixed(6)),
      errors: this.errors,
      errorRate: this.requests > 0 ? this.errors / this.requests : 0,
      uptime,
      requestsPerHour: hours > 0 ? this.requests / hours : 0,
      averageCostPerRequest: this.requests > 0 ? this.costs / this.requests : 0,
    };
  }

  static reset(): void {
    this.requests = 0;
    this.costs = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }

  static getCostAlert(): {
    shouldAlert: boolean;
    dailyProjection: number;
    monthlyProjection: number;
    threshold: number;
  } {
    const stats = this.getStats();
    const hoursElapsed = stats.uptime / (1000 * 60 * 60);

    // Project daily and monthly costs
    const dailyProjection =
      hoursElapsed > 0 ? (stats.costs / hoursElapsed) * 24 : 0;
    const monthlyProjection = dailyProjection * 30;

    // Alert threshold: $10/month
    const threshold = 10;
    const shouldAlert = monthlyProjection > threshold;

    return {
      shouldAlert,
      dailyProjection: parseFloat(dailyProjection.toFixed(4)),
      monthlyProjection: parseFloat(monthlyProjection.toFixed(2)),
      threshold,
    };
  }
}

export class PerformanceMonitor {
  private static operations: Array<{
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
  }> = [];

  static trackOperation(
    operation: string,
    duration: number,
    success: boolean
  ): void {
    this.operations.push({
      operation,
      duration,
      timestamp: Date.now(),
      success,
    });

    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
  }

  static getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    operationBreakdown: Record<
      string,
      {
        count: number;
        avgDuration: number;
        successRate: number;
      }
    >;
  } {
    const breakdown: Record<
      string,
      {
        count: number;
        totalDuration: number;
        successes: number;
        avgDuration: number;
        successRate: number;
      }
    > = {};

    this.operations.forEach((op) => {
      if (!breakdown[op.operation]) {
        breakdown[op.operation] = {
          count: 0,
          totalDuration: 0,
          successes: 0,
          avgDuration: 0,
          successRate: 0,
        };
      }

      breakdown[op.operation].count++;
      breakdown[op.operation].totalDuration += op.duration;
      if (op.success) {
        breakdown[op.operation].successes++;
      }
    });

    // Calculate averages
    Object.keys(breakdown).forEach((key) => {
      const stats = breakdown[key];
      stats.avgDuration = stats.totalDuration / stats.count;
      stats.successRate = stats.successes / stats.count;
    });

    const totalDuration = this.operations.reduce(
      (sum, op) => sum + op.duration,
      0
    );
    const successes = this.operations.filter((op) => op.success).length;

    return {
      totalOperations: this.operations.length,
      averageDuration:
        this.operations.length > 0 ? totalDuration / this.operations.length : 0,
      successRate:
        this.operations.length > 0 ? successes / this.operations.length : 0,
      operationBreakdown: Object.fromEntries(
        Object.entries(breakdown).map(([key, value]) => [
          key,
          {
            count: value.count,
            avgDuration: parseFloat(value.avgDuration.toFixed(2)),
            successRate: parseFloat(value.successRate.toFixed(4)),
          },
        ])
      ),
    };
  }

  static clearStats(): void {
    this.operations = [];
  }
}

// Utility function to track embedding operations
export async function trackEmbeddingOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  let success = false;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (error) {
    EmbeddingMonitor.trackError();
    throw error;
  } finally {
    const duration = Date.now() - start;
    PerformanceMonitor.trackOperation(operation, duration, success);
  }
}
