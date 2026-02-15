# TaskHQ Issues and Recommendations

This document provides an actionable guide for addressing technical debt, performance issues, code quality improvements, and testing gaps in the TaskHQ codebase.

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Performance Optimization](#performance-optimization)
3. [Code Quality Improvements](#code-quality-improvements)
4. [Missing Indexes](#missing-indexes)
5. [Error Handling Standardization](#error-handling-standardization)
6. [Testing Gaps](#testing-gaps)
7. [TODO Items Inventory](#todo-items-inventory)
8. [Recommended Refactoring](#recommended-refactoring)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Critical Issues

### 1. Security Vulnerabilities (See SECURITY-AUDIT.md)

**Priority:** IMMEDIATE

The following server actions lack authorization checks:

| File | Function | Risk |
|------|----------|------|
| `actions/tasks/delete-task.ts` | `deleteTask()` | Any user can delete any task |
| `actions/tasks/edit-task.ts` | `editTask()` | Any user can edit any task |
| `actions/tasks/delete-board.ts` | `deleteBoard()` | Any user can delete any board |
| `actions/tasks/get-board.ts` | `getBoard()` | Returns any board without access check |
| `actions/tasks/update-task-position.ts` | Multiple functions | No authorization |

**Action Required:** Implement authorization checks before any database mutations.

### 2. Inconsistent Company Isolation

**Priority:** HIGH

Some queries filter by `companyId` while others don't:

**Good Example (from `get-task-metrics.ts`):**
```typescript
const tasksByStatus = await db.task.groupBy({
  where: {
    boardSection: {
      board: {
        companyId: targetCompanyId, // ✅ Company isolation
        access: { has: session.user.id },
      },
    },
  },
});
```

**Bad Example (from `get-board.ts`):**
```typescript
export async function getBoard(boardId: string) {
  const board = await db.board.findUnique({
    where: { id: boardId },  // ❌ No company check
  });
  return board;
}
```

**Recommendation:** Audit all queries and ensure company isolation is consistent.

---

## Performance Optimization

### 1. N+1 Query Issues

**Location:** `actions/dashboard/get-task-metrics.ts`

**Problem:** The `getTaskMetrics()` function executes 12+ individual queries per call.

```typescript
// Current: 12+ queries
const tasksByStatus = await db.task.groupBy({...});
const tasksThisWeek = await db.task.count({...});
const tasksThisMonth = await db.task.count({...});
const overdueTasks = await db.task.count({...});
const completedTasksWithTime = await db.task.findMany({...});
const tasksLastWeek = await db.task.count({...});
const tasksLastMonth = await db.task.count({...});
// ... more queries
```

**Recommendation:** Use raw SQL aggregation:

```typescript
const metrics = await db.$queryRaw`
  WITH task_base AS (
    SELECT
      t.*,
      b."companyId"
    FROM "Task" t
    JOIN "BoardSection" bs ON t."boardSectionId" = bs.id
    JOIN "Board" b ON bs."boardId" = b.id
    WHERE b."companyId" = ${companyId}
  )
  SELECT
    COUNT(*) as "totalTasks",
    COUNT(*) FILTER (WHERE status = 'NEW') as "newTasks",
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as "inProgressTasks",
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as "completedTasks",
    COUNT(*) FILTER (WHERE "dueDate" < NOW() AND status NOT IN ('COMPLETED', 'CANCELLED')) as "overdueTasks",
    COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') as "tasksThisWeek",
    COUNT(*) FILTER (WHERE "createdAt" >= DATE_TRUNC('month', NOW())) as "tasksThisMonth",
    AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400)
      FILTER (WHERE status = 'COMPLETED') as "avgCompletionDays"
  FROM task_base
`;
```

**Impact:** Reduces from 12+ queries to 1 query.

---

### 2. Missing Pagination

**Location:** `actions/tasks/get-tasks.ts`

**Problem:** Returns ALL tasks without limits.

```typescript
export async function getTasks(boardSectionId: string) {
  return await db.task.findMany({
    where: { boardSectionId },  // No limit!
    orderBy: { position: "asc" },
  });
}
```

**Recommendation:**

```typescript
export async function getTasks(
  boardSectionId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 50, offset = 0 } = options ?? {};

  return await db.task.findMany({
    where: { boardSectionId },
    orderBy: { position: "asc" },
    take: limit,
    skip: offset,
  });
}
```

---

### 3. Inefficient Board Deletion

**Location:** `actions/tasks/delete-board.ts`

**Problem:** Uses nested loops with individual deletions instead of batch operations.

```typescript
// Current: O(n*m) individual delete calls
for (const section of sections) {
  const tasks = await db.task.findMany({...});
  for (const task of tasks) {
    await deleteTask(task.id);  // Individual call
  }
  await deleteBoardSection(section.id, boardId);
}
```

**Recommendation:** Use cascading deletes or batch operations:

```typescript
export async function deleteBoard(boardId: string) {
  // Single transaction with cascading
  await db.$transaction([
    db.taskEmbedding.deleteMany({
      where: { task: { boardSection: { boardId } } }
    }),
    db.task.deleteMany({
      where: { boardSection: { boardId } }
    }),
    db.boardSection.deleteMany({
      where: { boardId }
    }),
    db.boardEmbedding.deleteMany({
      where: { boardId }
    }),
    db.board.delete({
      where: { id: boardId }
    }),
  ]);
}
```

---

### 4. In-Memory Embedding Cache Not Invalidated

**Location:** `lib/ai/embedding-service.ts`

**Problem:** Cache is never invalidated when tasks/boards are updated.

```typescript
private cache: Map<string, { embedding: number[]; timestamp: number }> =
  new Map();
```

**Recommendation:**

1. Add cache invalidation on task/board updates
2. Consider using Redis for distributed caching
3. Implement cache warming on application startup

```typescript
// Add to embedding-service.ts
invalidateCacheForTask(taskId: string): void {
  for (const [key] of this.cache.entries()) {
    if (key.includes(taskId)) {
      this.cache.delete(key);
    }
  }
}
```

---

## Code Quality Improvements

### 1. Type Safety Issues with `as any` Casts

**Locations:**

| File | Line | Issue |
|------|------|-------|
| `actions/tasks/edit-task.ts` | 25 | `data: normalized as any` |
| `lib/ai/vector-search.ts` | 190 | `(searchResults as any[])` |
| `lib/ai/vector-search.ts` | 320 | `(keywordResults as any[])` |
| `lib/ai/vector-search.ts` | 476 | `(results as any[])` |
| `lib/ai/vector-search.ts` | 535 | `(results as any[])` |

**Recommendation:** Define proper types for raw SQL results:

```typescript
interface TaskSearchRow {
  task_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  board_name: string;
  section_name: string;
  assigned_to_name: string;
  createdAt: Date;
  dueDate: Date;
  content: string;
  metadata: Record<string, unknown>;
  similarity: string;
}

// Then use:
const results = await db.$queryRawUnsafe<TaskSearchRow[]>(...);
```

---

### 2. Unused or Misleading Parameters

**Location:** `actions/tasks/get-boards.ts:6`

```typescript
export async function getBoards(
  userId: string,  // ❌ Never used for authorization
  query?: string,
  companyId?: string
) {
  const session = await auth();  // Fetched but userId not validated
  // ...
}
```

**Recommendation:** Either:
- Remove unused `userId` parameter, OR
- Actually validate that `session.user.id === userId`

---

### 3. Inconsistent Error Response Formats

**Current patterns in use:**

```typescript
// Pattern 1: Return object with error
return { error: "Something went wrong" }

// Pattern 2: Return object with success/error
return { success: false, error: "Something went wrong" }

// Pattern 3: Throw errors
throw new Error("Something went wrong")

// Pattern 4: Return null
return null
```

**Recommendation:** Standardize on one pattern:

```typescript
// Standard result type
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Use everywhere
export async function myAction(): Promise<Result<Data>> {
  if (error) {
    return { success: false, error: "Description" };
  }
  return { success: true, data: result };
}
```

---

### 4. Code Duplication in Embedding Processes

**Files with similar patterns:**
- `lib/ai/embedding-triggers.ts`
- `lib/ai/embedding-storage.ts`
- `lib/ai/embedding-service.ts`

**Recommendation:** Consolidate into a single `EmbeddingManager` class:

```typescript
class EmbeddingManager {
  // Single source of truth for embedding operations
  async generateAndStore(content: string, type: 'task' | 'board', id: string)
  async update(type: 'task' | 'board', id: string)
  async delete(type: 'task' | 'board', id: string)
  async search(query: string, type: 'task' | 'board', filters: SearchFilters)
}
```

---

## Missing Indexes

Add these indexes to improve query performance:

```prisma
// In schema.prisma

model Task {
  // Add index for foreign key lookups
  @@index([boardSectionId])
  @@index([assignedToId])
  @@index([createdById])
  @@index([status])
  @@index([dueDate])
  @@index([createdAt])
}

model BoardSection {
  // Add index for board lookups
  @@index([boardId])
}

model TaskEmbedding {
  // Already has taskId unique constraint
}

// Composite indexes for common query patterns
model Task {
  @@index([boardSectionId, position])  // For position ordering
  @@index([status, dueDate])           // For overdue queries
  @@index([assignedToId, status])      // For user task lists
}
```

**Migration SQL:**

```sql
-- Run CONCURRENTLY to avoid locking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_board_section_id
  ON "Task" ("boardSectionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_assigned_to_id
  ON "Task" ("assignedToId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_status
  ON "Task" (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_due_date
  ON "Task" ("dueDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_board_section_board_id
  ON "BoardSection" ("boardId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_position
  ON "Task" ("boardSectionId", position);
```

---

## Error Handling Standardization

### Current Issues

1. **Inconsistent try-catch patterns**
2. **Generic error messages lose context**
3. **Some functions silently fail**

### Recommended Standard

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'UNAUTHORIZED', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super('Validation failed', 'VALIDATION_ERROR', 400, details);
  }
}

// Usage in server actions
export async function getTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  return task;
}
```

---

## Testing Gaps

### Current Coverage

- `lib/ai/__tests__/agent-system.test.ts` - AI agent tests
- `actions/tasks/__tests__/update-active-tasks-due-date.test.ts`
- `actions/tasks/__tests__/bulk-update-due-dates.test.ts`

### Missing Test Categories

1. **Server Actions Unit Tests**
   - Authentication actions
   - Company actions
   - Task CRUD operations
   - Board CRUD operations
   - Position updates

2. **API Route Integration Tests**
   - AI endpoints
   - MCP endpoints
   - Auth endpoints

3. **Security Tests**
   - Authorization bypass attempts
   - Cross-tenant access attempts
   - Rate limiting validation

4. **E2E Tests**
   - User registration flow
   - Task creation flow
   - Board management
   - AI assistant interactions

### Recommended Test Structure

```
__tests__/
├── unit/
│   ├── actions/
│   │   ├── auth-actions.test.ts
│   │   ├── company-actions.test.ts
│   │   └── task-actions.test.ts
│   └── lib/
│       ├── ai/
│       │   ├── embedding-service.test.ts
│       │   └── vector-search.test.ts
│       └── security/
│           └── ai-security.test.ts
├── integration/
│   ├── api/
│   │   ├── ai-chat.test.ts
│   │   └── auth.test.ts
│   └── db/
│       └── task-queries.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── dashboard.spec.ts
    └── tasks.spec.ts
```

---

## TODO Items Inventory

The following TODO comments exist in the codebase:

| File | Line | Description | Priority |
|------|------|-------------|----------|
| `dashboard/_components/enhanced-dynamic-cards.tsx` | 69 | Add aiUsageStats to UserMetricsData | LOW |
| `dashboard/_components/enhanced-dynamic-cards.tsx` | 77 | Add documentStats to UserMetricsData | LOW |
| `api/ai/agents/metrics/route.ts` | 30 | Implement performance metrics in agent architecture | MEDIUM |
| `api/ai/agents/metrics/route.ts` | 114 | Implement proper role-based access control | HIGH |
| `api/ai/agents/metrics/route.ts` | 123 | Implement metrics reset in agent architecture | LOW |
| `api/ai/agents/route.ts` | 91 | Implement proper email verification check | MEDIUM |
| `components/ai/project-insights.tsx` | 142 | Set mock data until streaming API works | MEDIUM |
| `actions/tasks/mark-done.ts` | 75 | Update task embeddings on mark done | MEDIUM |
| `actions/dashboard/get-user-metrics.ts` | 347 | Calculate productivity trend | LOW |
| `actions/dashboard/get-board-metrics.ts` | 329 | Implement archived status | LOW |
| `lib/ai/vector-search.ts` | 392 | Resolve Prisma + pgvector integration | HIGH |
| `lib/ai/mcp-auth.ts` | 262 | Implement API key validation against database | HIGH |
| `lib/jobs/board-generation-job.ts` | 139 | Trigger user notification via real-time service | MEDIUM |
| `lib/jobs/board-generation-job.ts` | 154 | Trigger user notification about failure | MEDIUM |

---

## Recommended Refactoring

### 1. Create Authorization Middleware

```typescript
// lib/middleware/withAuthorization.ts
export function withTaskAuthorization<T>(
  action: (taskId: string, ...args: any[]) => Promise<T>
) {
  return async (taskId: string, ...args: any[]): Promise<T> => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new AuthorizationError('Not authenticated');
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        boardSection: {
          include: { board: true }
        }
      }
    });

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const hasAccess =
      task.createdById === session.user.id ||
      task.assignedToId === session.user.id ||
      task.boardSection.board.access.includes(session.user.id);

    if (!hasAccess) {
      throw new AuthorizationError('Access denied to task');
    }

    return action(taskId, ...args);
  };
}

// Usage
export const deleteTask = withTaskAuthorization(
  async (taskId: string) => {
    await db.task.delete({ where: { id: taskId } });
  }
);
```

### 2. Consolidate Database Query Patterns

```typescript
// lib/db/queries/tasks.ts
export const taskQueries = {
  findByIdWithAccess: async (taskId: string, userId: string) => {
    return db.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { createdById: userId },
          { assignedToId: userId },
          { boardSection: { board: { access: { has: userId } } } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        boardSection: { include: { board: true } },
      },
    });
  },

  findByBoardWithCompany: async (boardId: string, companyId: string) => {
    return db.task.findMany({
      where: {
        boardSection: {
          board: { id: boardId, companyId },
        },
      },
      orderBy: { position: 'asc' },
    });
  },
};
```

### 3. Create Service Layer

```typescript
// services/TaskService.ts
export class TaskService {
  constructor(
    private userId: string,
    private companyId: string
  ) {}

  async create(data: CreateTaskInput): Promise<Task> {
    // Validation + business logic + database
  }

  async update(taskId: string, data: UpdateTaskInput): Promise<Task> {
    // Authorization + validation + business logic + database
  }

  async delete(taskId: string): Promise<void> {
    // Authorization + cascade logic + database
  }

  async getMetrics(): Promise<TaskMetrics> {
    // Optimized aggregation query
  }
}
```

---

## Implementation Roadmap

### Phase 1: Security (Week 1-2)

1. [ ] Add authorization to `deleteTask`
2. [ ] Add authorization to `editTask`
3. [ ] Add authorization to `deleteBoard`
4. [ ] Add authorization to `getBoard`
5. [ ] Add authorization to position update functions
6. [ ] Audit all server actions for company isolation
7. [ ] Add security tests

### Phase 2: Performance (Week 3-4)

1. [ ] Add missing database indexes
2. [ ] Refactor `getTaskMetrics` to use aggregation query
3. [ ] Add pagination to `getTasks`
4. [ ] Optimize board deletion with batch operations
5. [ ] Implement Redis-based rate limiting
6. [ ] Add query performance monitoring

### Phase 3: Code Quality (Week 5-6)

1. [ ] Create centralized error handling
2. [ ] Standardize response formats
3. [ ] Add TypeScript types for raw SQL results
4. [ ] Remove unused parameters
5. [ ] Consolidate embedding services
6. [ ] Create authorization middleware

### Phase 4: Testing (Week 7-8)

1. [ ] Add unit tests for server actions
2. [ ] Add integration tests for API routes
3. [ ] Add E2E tests for critical flows
4. [ ] Set up CI/CD test pipeline
5. [ ] Add test coverage reporting

### Phase 5: Tech Debt (Ongoing)

1. [ ] Address all TODO items
2. [ ] Update documentation
3. [ ] Regular security audits
4. [ ] Performance monitoring
5. [ ] Dependency updates

---

## Monitoring Recommendations

### Performance Metrics to Track

1. **Query Performance**
   - Average query duration
   - Slow query logging (>100ms)
   - Query count per request

2. **API Performance**
   - Response time by endpoint
   - Error rate by endpoint
   - Rate limit hits

3. **AI System**
   - Embedding generation time
   - Vector search latency
   - AI API response time

### Suggested Tools

- **APM:** Sentry Performance or Vercel Analytics
- **Database:** Prisma Accelerate metrics or pganalyze
- **Logging:** Structured logging with correlation IDs
- **Alerts:** Set up alerts for error spikes and latency

---

*Last Updated: January 2026*
*Document Version: 1.0*
