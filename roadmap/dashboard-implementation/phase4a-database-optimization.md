# Phase 4A: Database Optimization & Performance

## Phase Overview

**Objective**: Optimize database queries, add proper indexing, and implement performance monitoring for dashboard operations.

**Duration**: 3-4 days

**Prerequisites**: Phase 3A completed (real data table implemented)

**Success Criteria**:

- All dashboard queries optimized with proper indexes
- Query performance monitoring implemented
- Dashboard loads in < 2 seconds consistently
- Database connection pooling optimized

## Technical Implementation

### Step 1: Database Schema Analysis and Indexing

Create `scripts/optimize-dashboard-db.sql`:

```sql
-- Task table indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_status_updated
ON tasks(company_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_priority_created
ON tasks(company_id, priority, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_assigned_status
ON tasks(company_id, assigned_to_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_board_section
ON tasks(company_id, board_id, section_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_due_date
ON tasks(company_id, due_date) WHERE due_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_company_completed
ON tasks(company_id, completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_search
ON tasks USING gin((title || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- Board table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boards_company_created
ON boards(company_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boards_company_updated
ON boards(company_id, updated_at DESC);

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_role
ON users(cid, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_login
ON users(cid, last_login) WHERE last_login IS NOT NULL;

-- Board sections index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_board_sections_board_position
ON board_sections(board_id, position);

-- Add trigram extension for text search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Statistics for query planner
ANALYZE tasks;
ANALYZE boards;
ANALYZE users;
ANALYZE board_sections;
```

### Step 2: Create Query Performance Monitoring

Create `lib/dashboard/performance-monitor.ts`:

```typescript
import { performance } from "perf_hooks";

export interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  userId?: string;
  companyId?: string;
  recordCount?: number;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000;

  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    context?: { userId?: string; companyId?: string },
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await queryFn();
      const executionTime = performance.now() - startTime;

      // Record metrics
      this.recordMetric({
        query: queryName,
        executionTime,
        timestamp: new Date(),
        userId: context?.userId,
        companyId: context?.companyId,
        recordCount: Array.isArray(result) ? result.length : undefined,
      });

      // Log slow queries (> 1 second)
      if (executionTime > 1000) {
        console.warn(
          `Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`,
        );
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error(
        `Query failed: ${queryName} after ${executionTime.toFixed(2)}ms`,
        error,
      );
      throw error;
    }
  }

  private recordMetric(metric: QueryMetrics) {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(queryName?: string): QueryMetrics[] {
    if (queryName) {
      return this.metrics.filter((m) => m.query === queryName);
    }
    return [...this.metrics];
  }

  getAverageExecutionTime(queryName: string): number {
    const queryMetrics = this.getMetrics(queryName);
    if (queryMetrics.length === 0) return 0;

    const total = queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return total / queryMetrics.length;
  }

  getSlowQueries(threshold = 500): QueryMetrics[] {
    return this.metrics.filter((m) => m.executionTime > threshold);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Helper decorator for measuring query performance
export function measurePerformance(queryName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureQuery(
        `${target.constructor.name}.${propertyKey}`,
        () => originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
```

### Step 3: Optimize Dashboard Data Actions

Update `actions/dashboard/get-task-metrics.ts` with performance monitoring:

```typescript
import { performanceMonitor } from "@/lib/dashboard/performance-monitor";

export async function getTaskMetrics(
  input?: z.infer<typeof TaskMetricsSchema>,
): Promise<{ data?: TaskMetricsData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = TaskMetricsSchema.parse(input || {});

    // Use performance monitoring for database queries
    const [statusCounts, tasksThisWeek, tasksThisMonth, overdueTasks] =
      await Promise.all([
        performanceMonitor.measureQuery(
          "task-metrics-status-counts",
          () =>
            db.task.groupBy({
              by: ["status"],
              where: { companyId },
              _count: { id: true },
            }),
          { userId: session.user.id, companyId },
        ),

        performanceMonitor.measureQuery(
          "task-metrics-week-count",
          () =>
            db.task.count({
              where: {
                companyId,
                createdAt: { gte: weekStart },
              },
            }),
          { userId: session.user.id, companyId },
        ),

        // ... other optimized queries
      ]);

    // Rest of implementation
  } catch (error) {
    // Error handling
  }
}
```

### Step 4: Create Database Health Check API

Create `app/api/health/db/route.ts`:

```typescript
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { performanceMonitor } from "@/lib/dashboard/performance-monitor";

export async function GET() {
  try {
    const startTime = Date.now();

    // Test basic connectivity
    await db.$queryRaw`SELECT 1`;

    // Test dashboard-critical queries
    const healthChecks = await Promise.all([
      // Test task count query
      performanceMonitor.measureQuery("health-check-task-count", () =>
        db.task.count({ where: { companyId: "test" } }),
      ),

      // Test user count query
      performanceMonitor.measureQuery("health-check-user-count", () =>
        db.user.count({ where: { cid: "test" } }),
      ),

      // Test board count query
      performanceMonitor.measureQuery("health-check-board-count", () =>
        db.board.count({ where: { companyId: "test" } }),
      ),
    ]);

    const totalTime = Date.now() - startTime;
    const slowQueries = performanceMonitor.getSlowQueries(1000);

    return NextResponse.json({
      status: "healthy",
      database: {
        connected: true,
        responseTime: totalTime,
        queryPerformance: {
          healthCheckQueries: healthChecks.length,
          slowQueries: slowQueries.length,
          averageQueryTime:
            performanceMonitor.getAverageExecutionTime("health-check"),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
```

### Step 5: Implement Query Caching Strategy

Create `lib/dashboard/cache.ts`:

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const dashboardCache = new DashboardCache();

// Helper function for cached queries
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  // Try to get from cache first
  const cached = dashboardCache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Execute query and cache result
  const result = await queryFn();
  dashboardCache.set(cacheKey, result, ttl);

  return result;
}
```

### Step 6: Update Actions with Caching

Example optimization for task metrics:

```typescript
export async function getTaskMetrics(
  input?: z.infer<typeof TaskMetricsSchema>,
): Promise<{ data?: TaskMetricsData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = TaskMetricsSchema.parse(input || {});

    // Generate cache key
    const cacheKey = dashboardCache.generateKey("task-metrics", {
      companyId,
      dateRange: validatedInput.dateRange,
      boardId: validatedInput.boardId,
    });

    // Use cached query with 2-minute TTL for metrics
    const result = await cachedQuery(
      cacheKey,
      async () => {
        // Execute all database queries with performance monitoring
        const [statusCounts /* other queries */] = await Promise.all([
          performanceMonitor.measureQuery(
            "task-metrics-status-counts",
            () =>
              db.task.groupBy({
                by: ["status"],
                where: { companyId },
                _count: { id: true },
              }),
            { userId: session.user.id, companyId },
          ),
          // ... other queries
        ]);

        // Process and return data
        return processTaskMetrics(statusCounts /* other data */);
      },
      2 * 60 * 1000, // 2 minutes TTL
    );

    return { data: result };
  } catch (error) {
    console.error("Task metrics error:", error);
    return { error: "Failed to retrieve task metrics" };
  }
}
```

## Performance Benchmarks

### Target Performance Metrics

- Dashboard initial load: < 2 seconds
- Individual metric queries: < 500ms
- Table pagination: < 300ms
- Chart data loading: < 800ms
- Search/filter responses: < 400ms

### Database Query Optimization Checklist

- [ ] All company_id filters use indexes
- [ ] Date range queries use proper indexes
- [ ] Text search uses GIN indexes with trigrams
- [ ] JOIN queries are optimized
- [ ] No N+1 query problems
- [ ] Proper use of LIMIT and OFFSET

## Monitoring and Alerting

### Set up Performance Alerts

Create `lib/dashboard/alerts.ts`:

```typescript
export interface PerformanceAlert {
  type: "slow_query" | "high_error_rate" | "cache_miss_rate";
  threshold: number;
  message: string;
  timestamp: Date;
}

export function checkPerformanceThresholds() {
  const alerts: PerformanceAlert[] = [];

  // Check for slow queries
  const slowQueries = performanceMonitor.getSlowQueries(2000); // 2 seconds
  if (slowQueries.length > 5) {
    alerts.push({
      type: "slow_query",
      threshold: 2000,
      message: `${slowQueries.length} queries exceeded 2 second threshold`,
      timestamp: new Date(),
    });
  }

  // Add more checks as needed

  return alerts;
}
```

## Testing and Verification

### Performance Testing

- [ ] Load test with 1000+ tasks
- [ ] Concurrent user simulation
- [ ] Query execution time measurement
- [ ] Memory usage monitoring
- [ ] Cache hit rate analysis

### Database Testing

- [ ] Index effectiveness verification
- [ ] Query plan analysis
- [ ] Connection pool optimization
- [ ] Deadlock prevention testing

## Completion Checklist

### Database Optimization

- [ ] All dashboard indexes created
- [ ] Query performance measured and optimized
- [ ] No queries exceed 500ms average
- [ ] Connection pooling optimized

### Monitoring Implementation

- [ ] Performance monitoring active
- [ ] Database health checks functional
- [ ] Alerting system configured
- [ ] Cache metrics tracked

### Performance Targets Met

- [ ] Dashboard loads in < 2 seconds
- [ ] All metrics load in < 500ms
- [ ] Table pagination < 300ms
- [ ] Search responses < 400ms

## Files Created/Modified

### New Files

- `scripts/optimize-dashboard-db.sql`
- `lib/dashboard/performance-monitor.ts`
- `lib/dashboard/cache.ts`
- `lib/dashboard/alerts.ts`
- `app/api/health/db/route.ts`

### Modified Files

- `actions/dashboard/get-task-metrics.ts`
- `actions/dashboard/get-board-metrics.ts`
- `actions/dashboard/get-user-metrics.ts`
- `actions/dashboard/get-task-table-data.ts`

This completes Phase 4A with comprehensive database optimization and performance monitoring for the dashboard system.
