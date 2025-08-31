# Phase 4B: Advanced Caching Implementation

## Phase Overview

**Objective**: Implement Redis-based caching, cache invalidation strategies, and background refresh jobs for optimal dashboard performance.

**Duration**: 3-4 days

**Prerequisites**: Phase 4A completed (database optimization and performance monitoring)

**Success Criteria**:

- Redis caching layer implemented
- Smart cache invalidation on data changes
- Background refresh jobs for expensive queries
- Cache hit rates > 80% for repeated requests

## Key Implementation Areas

### 1. Redis Integration Setup

```typescript
// lib/cache/redis-client.ts
import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

export class DashboardCache {
  private readonly prefix = "dashboard:";

  async set(key: string, data: any, ttl = 300): Promise<void> {
    await redis.setex(`${this.prefix}${key}`, ttl, JSON.stringify(data));
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(`${this.prefix}${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`${this.prefix}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### 2. Cache-Aware Data Actions

```typescript
// Enhanced actions with Redis caching
export async function getTaskMetrics(input?: TaskMetricsInput) {
  const cacheKey = `metrics:tasks:${companyId}:${JSON.stringify(input)}`;

  // Try cache first
  const cached = await dashboardCache.get<TaskMetricsData>(cacheKey);
  if (cached) return { data: cached };

  // Execute query and cache result
  const result = await executeTaskMetricsQuery(input);
  await dashboardCache.set(cacheKey, result, 180); // 3 minutes

  return { data: result };
}
```

### 3. Real-time Cache Invalidation

```typescript
// lib/cache/invalidation.ts
export async function invalidateTaskCache(companyId: string, taskId?: string) {
  await Promise.all([
    dashboardCache.invalidatePattern(`metrics:tasks:${companyId}*`),
    dashboardCache.invalidatePattern(`table:tasks:${companyId}*`),
    taskId && dashboardCache.invalidatePattern(`task:${taskId}*`),
  ]);
}

// Trigger after task operations
export async function createTask(data: TaskData) {
  const task = await db.task.create({ data });
  await invalidateTaskCache(data.companyId, task.id);
  return task;
}
```

### 4. Background Refresh Jobs

```typescript
// lib/cache/background-refresh.ts
export class BackgroundRefresh {
  async refreshDashboardCache(companyId: string) {
    // Pre-warm frequently accessed data
    await Promise.all([
      this.preWarmTaskMetrics(companyId),
      this.preWarmBoardMetrics(companyId),
      this.preWarmUserMetrics(companyId),
    ]);
  }

  private async preWarmTaskMetrics(companyId: string) {
    const commonRanges = ["7d", "30d", "90d"];
    await Promise.all(
      commonRanges.map((range) =>
        getTaskMetrics({ dateRange: range, companyId }),
      ),
    );
  }
}
```

## Implementation Checklist

### Redis Setup

- [ ] Redis client configured
- [ ] Connection pooling optimized
- [ ] Error handling for Redis failures
- [ ] Cache key naming strategy defined

### Cache Integration

- [ ] All dashboard actions use caching
- [ ] Cache TTL values optimized
- [ ] Cache hit/miss monitoring
- [ ] Fallback to database on cache miss

### Cache Invalidation

- [ ] Real-time invalidation on data changes
- [ ] Pattern-based cache clearing
- [ ] Batch invalidation optimization
- [ ] Cache warming strategies

### Performance Monitoring

- [ ] Cache hit rate tracking
- [ ] Redis performance monitoring
- [ ] Memory usage optimization
- [ ] Background job scheduling

This phase establishes enterprise-grade caching for optimal dashboard performance.
