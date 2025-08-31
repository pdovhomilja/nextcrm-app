# Phase 1A: Dashboard Infrastructure & Task Metrics

## Phase Overview

**Objective**: Establish the foundational infrastructure for dashboard analytics and implement basic task metrics functionality.

**Duration**: 3-5 days

**Success Criteria**:

- Dashboard action infrastructure created with proper TaskHQ patterns
- Basic task counting and status metrics implemented
- One section card replaced with real data as proof of concept
- All security and validation patterns established

## Prerequisites

- TaskHQ development environment set up
- Database connection working (`@/lib/db`)
- Next-Auth v5 session management functional
- Understanding of TaskHQ coding standards

## Technical Implementation

### Step 1: Create Dashboard Actions Infrastructure

#### 1.1 Create Base Dashboard Actions Directory

```bash
mkdir -p actions/dashboard
```

#### 1.2 Create Task Metrics Action

Create `actions/dashboard/get-task-metrics.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

// Validation schema for input parameters
const TaskMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  boardId: z.string().optional(),
});

export type TaskMetricsData = {
  totalTasks: number;
  tasksByStatus: {
    NEW: number;
    IN_PROGRESS: number;
    ON_HOLD: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  tasksThisWeek: number;
  tasksThisMonth: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number | null;
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
  };
};

export async function getTaskMetrics(
  input?: z.infer<typeof TaskMetricsSchema>,
): Promise<{ data?: TaskMetricsData; error?: string }> {
  try {
    // Session validation (TaskHQ pattern)
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    // Company data isolation check
    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    // Input validation
    const validatedInput = TaskMetricsSchema.parse(input || {});
    const { dateRange, boardId } = validatedInput;

    // Calculate date range for filtering
    const now = new Date();
    let dateFilter: Date | undefined;

    switch (dateRange) {
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = undefined;
    }

    // Base query filter with company isolation
    const baseFilter = {
      companyId, // Always filter by company ID
      ...(boardId && { boardId }),
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
    };

    // Get all tasks count by status with company filtering
    const tasksByStatus = await db.task.groupBy({
      by: ["status"],
      where: {
        companyId, // Company isolation
        ...(boardId && { boardId }),
      },
      _count: {
        id: true,
      },
    });

    // Transform status counts to expected format
    const statusCounts = {
      NEW: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    tasksByStatus.forEach((item) => {
      statusCounts[item.status as keyof typeof statusCounts] = item._count.id;
    });

    const totalTasks = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Get tasks created this week
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tasksThisWeek = await db.task.count({
      where: {
        ...baseFilter,
        createdAt: { gte: weekStart },
      },
    });

    // Get tasks created this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tasksThisMonth = await db.task.count({
      where: {
        ...baseFilter,
        createdAt: { gte: monthStart },
      },
    });

    // Get overdue tasks
    const overdueTasks = await db.task.count({
      where: {
        companyId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now },
        ...(boardId && { boardId }),
      },
    });

    // Calculate completion rate
    const completedTasks = statusCounts.COMPLETED;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time (for completed tasks)
    const completedTasksWithTime = await db.task.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        completedAt: { not: null },
        ...(boardId && { boardId }),
        ...(dateFilter && { completedAt: { gte: dateFilter } }),
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    let averageCompletionTime: number | null = null;
    if (completedTasksWithTime.length > 0) {
      const totalTime = completedTasksWithTime.reduce((sum, task) => {
        if (task.completedAt) {
          return sum + (task.completedAt.getTime() - task.createdAt.getTime());
        }
        return sum;
      }, 0);
      averageCompletionTime = Math.round(
        totalTime / completedTasksWithTime.length / (1000 * 60 * 60 * 24),
      ); // Convert to days
    }

    // Calculate trends (week over week, month over month)
    const lastWeekStart = new Date(
      weekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const tasksLastWeek = await db.task.count({
      where: {
        companyId,
        createdAt: { gte: lastWeekStart, lt: weekStart },
        ...(boardId && { boardId }),
      },
    });

    const lastMonthStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() - 1,
      1,
    );
    const tasksLastMonth = await db.task.count({
      where: {
        companyId,
        createdAt: { gte: lastMonthStart, lt: monthStart },
        ...(boardId && { boardId }),
      },
    });

    const weekOverWeek =
      tasksLastWeek > 0
        ? ((tasksThisWeek - tasksLastWeek) / tasksLastWeek) * 100
        : 0;
    const monthOverMonth =
      tasksLastMonth > 0
        ? ((tasksThisMonth - tasksLastMonth) / tasksLastMonth) * 100
        : 0;

    const result: TaskMetricsData = {
      totalTasks,
      tasksByStatus: statusCounts,
      tasksThisWeek,
      tasksThisMonth,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
      averageCompletionTime,
      trends: {
        weekOverWeek: Math.round(weekOverWeek * 100) / 100,
        monthOverMonth: Math.round(monthOverMonth * 100) / 100,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: "Validation failed",
        // Include field errors for debugging
      };
    }
    console.error("Task metrics error:", error);
    return { error: "Failed to retrieve task metrics" };
  }
}
```

### Step 2: Create Dashboard Component Infrastructure

#### 2.1 Create Dashboard Components Directory

```bash
mkdir -p components/dashboard
mkdir -p components/dashboard/metrics
```

#### 2.2 Create Task Metrics Card Component

Create `components/dashboard/metrics/task-metrics-card.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getTaskMetrics, type TaskMetricsData } from "@/actions/dashboard/get-task-metrics"
import { ClipboardList, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface TaskMetricsCardProps {
  boardId?: string
  dateRange?: '7d' | '30d' | '90d' | 'all'
  className?: string
}

export function TaskMetricsCard({ boardId, dateRange = '30d', className }: TaskMetricsCardProps) {
  const [data, setData] = useState<TaskMetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getTaskMetrics({ dateRange, boardId })

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch task metrics:', err)
        setError('Failed to load task metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [dateRange, boardId])

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-gray-400"
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Total Tasks
        </CardTitle>
        <CardDescription>
          {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main metric */}
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{data.totalTasks.toLocaleString()}</div>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.monthOverMonth)}`}>
              {getTrendIcon(data.trends.monthOverMonth)}
              <span>{Math.abs(data.trends.monthOverMonth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Active: {data.tasksByStatus.NEW + data.tasksByStatus.IN_PROGRESS + data.tasksByStatus.ON_HOLD}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Done: {data.tasksByStatus.COMPLETED}
            </Badge>
            {data.overdueTasks > 0 && (
              <Badge variant="destructive" className="text-xs">
                Overdue: {data.overdueTasks}
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Completion rate: {data.completionRate}%</div>
            {data.averageCompletionTime && (
              <div>Avg. completion: {data.averageCompletionTime} days</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 3: Update Dashboard Page

#### 3.1 Update Section Cards Component

Update `app/(app)/[cid]/dashboard/_components/section-cards.tsx` to use the new Task Metrics Card:

```typescript
import { TaskMetricsCard } from "@/components/dashboard/metrics/task-metrics-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Replace first hardcoded card with real task metrics */}
      <TaskMetricsCard className="w-full" />

      {/* Temporary: Keep other cards as placeholders for future phases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <CardDescription>Board metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1,234</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
          <CardDescription>User metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">573</div>
          <p className="text-xs text-muted-foreground">
            +201 since last hour
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Security and Validation Implementation

### Session Validation Pattern

All dashboard actions follow this pattern:

```typescript
const session = await auth();
if (!session?.user) {
  return { error: "Authentication required" };
}

const companyId = session.user.cid;
if (!companyId) {
  return { error: "Company context required" };
}
```

### Company Data Isolation

Every database query includes `companyId` filtering:

```typescript
const baseFilter = {
  companyId, // Always filter by company ID
  // ... other filters
};
```

### Input Validation with Zod

All inputs are validated using Zod schemas:

```typescript
const TaskMetricsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  boardId: z.string().optional(),
});
```

## Testing and Verification

### Unit Tests

Create `__tests__/dashboard/get-task-metrics.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTaskMetrics } from "@/actions/dashboard/get-task-metrics";

// Mock the auth function
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database
vi.mock("@/lib/db", () => ({
  default: {
    task: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("getTaskMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require authentication", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const result = await getTaskMetrics();
    expect(result.error).toBe("Authentication required");
  });

  it("should require company context", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user1" },
    } as any);

    const result = await getTaskMetrics();
    expect(result.error).toBe("Company context required");
  });

  // Add more tests for successful cases, validation, etc.
});
```

### Manual Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Task metrics card displays real data
- [ ] Data is properly filtered by company ID
- [ ] Loading states work correctly
- [ ] Error states display appropriately
- [ ] Different date ranges work
- [ ] Responsive design functions on mobile

### Performance Testing

- [ ] Dashboard loads in < 2 seconds
- [ ] Database queries execute in < 500ms
- [ ] No memory leaks in React components
- [ ] Proper cleanup in useEffect hooks

## Database Considerations

### Required Indexes

The following indexes should already exist from the base TaskHQ schema, but verify:

```sql
-- Verify these indexes exist for optimal performance
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_created ON tasks(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_company_due_date ON tasks(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_company_completed ON tasks(company_id, completed_at);
```

### Query Performance Monitoring

Monitor these queries for performance:

- Task count by status grouping
- Date range filtering
- Company ID filtering
- Overdue task calculation

## Error Handling

### Client-Side Error Boundaries

Components include proper error handling:

```typescript
if (error) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Task Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-red-600">{error}</div>
      </CardContent>
    </Card>
  )
}
```

### Server-Side Error Handling

Actions include comprehensive error handling:

```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof z.ZodError) {
    return { error: "Validation failed" };
  }
  console.error("Task metrics error:", error);
  return { error: "Failed to retrieve task metrics" };
}
```

## Completion Checklist

### Code Quality

- [ ] All TypeScript compilation errors resolved (`pnpm build` passes)
- [ ] All ESLint warnings/errors fixed (`pnpm lint` passes)
- [ ] Code follows TaskHQ conventions and style
- [ ] JSDoc comments added for complex functions

### Security & Validation

- [ ] Server actions validate session with `auth()` from Next-Auth v5
- [ ] All database queries filter by `cid` (company ID)
- [ ] Input validation implemented with Zod schemas
- [ ] Error handling follows established patterns

### Database & Performance

- [ ] Database connection uses centralized `db` import from `@/lib/db`
- [ ] Queries are optimized and use proper indexes
- [ ] No new PrismaClient instances created
- [ ] Performance meets requirements (< 500ms queries)

### UI/UX Standards

- [ ] UI components use shadcn/ui (New York style, neutral base)
- [ ] Components are responsive and work on mobile
- [ ] Loading states implemented for async operations
- [ ] Error boundaries handle component failures
- [ ] Accessibility standards maintained

### Testing

- [ ] Unit tests written for server actions
- [ ] Integration tests verify end-to-end functionality
- [ ] Manual testing completed for all user scenarios
- [ ] Edge cases and error conditions tested

### Documentation

- [ ] Code is well-commented and self-documenting
- [ ] README updates reflect new functionality
- [ ] Phase resume document prepared

## Files Created/Modified

### New Files

- `actions/dashboard/get-task-metrics.ts`
- `components/dashboard/metrics/task-metrics-card.tsx`
- `__tests__/dashboard/get-task-metrics.test.ts`

### Modified Files

- `app/(app)/[cid]/dashboard/_components/section-cards.tsx`

## Next Phase Preparation

Phase 1B will build upon this foundation by:

- Adding board metrics functionality
- Implementing user activity tracking
- Completing the remaining section cards
- Establishing patterns for more complex metrics

Ensure the following are ready for Phase 1B:

- Task metrics are working and tested
- Dashboard infrastructure is solid
- Security patterns are established
- Error handling is comprehensive

## Troubleshooting Guide

### Common Issues

**Issue**: "Company context required" error
**Solution**: Ensure user session includes `cid` field

**Issue**: Database connection errors
**Solution**: Verify `@/lib/db` import is used, not new PrismaClient()

**Issue**: TypeScript compilation errors
**Solution**: Ensure all types are properly imported and defined

**Issue**: Performance issues with metrics
**Solution**: Check database indexes and query optimization

**Issue**: Component not updating with new data
**Solution**: Verify useEffect dependencies and state management

### Debug Approaches

1. Check browser console for client-side errors
2. Check server logs for action errors
3. Verify database queries with Prisma Studio
4. Test with different company IDs and user roles
5. Monitor network requests in developer tools

This completes Phase 1A implementation. The foundation is now ready for Phase 1B development.
