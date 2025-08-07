# Phase 3A: Real Data Table Foundation

## Phase Overview

**Objective**: Replace mock JSON data table with real task data, implementing server-side pagination, filtering, and company-scoped security.

**Duration**: 4-6 days

**Prerequisites**: Phase 1A-1B completed (dashboard metrics infrastructure)

**Success Criteria**:

- Mock data table replaced with real task data
- Server-side pagination and filtering implemented
- Company-scoped data access enforced
- Responsive table design with proper loading states

## Technical Implementation

### Step 1: Create Task Data Table Actions

Create `actions/dashboard/get-task-table-data.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

const TaskTableFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z
    .enum(["NEW", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  boardId: z.string().optional(),
  assignedToId: z.string().optional(),
  sortBy: z
    .enum(["title", "status", "priority", "dueDate", "createdAt", "updatedAt"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  dueDateFilter: z
    .enum(["overdue", "today", "week", "month", "all"])
    .optional(),
});

export type TaskTableRow = {
  id: string;
  title: string;
  description: string | null;
  status: "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  board: {
    id: string;
    title: string;
  };
  section: {
    id: string;
    title: string;
  } | null;
  isOverdue: boolean;
};

export type TaskTableData = {
  tasks: TaskTableRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: z.infer<typeof TaskTableFiltersSchema>;
  summary: {
    totalTasks: number;
    statusCounts: {
      NEW: number;
      IN_PROGRESS: number;
      ON_HOLD: number;
      COMPLETED: number;
      CANCELLED: number;
    };
    priorityCounts: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      CRITICAL: number;
    };
    overdueTasks: number;
  };
};

export async function getTaskTableData(
  input?: Partial<z.infer<typeof TaskTableFiltersSchema>>
): Promise<{ data?: TaskTableData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const filters = TaskTableFiltersSchema.parse(input || {});
    const {
      page,
      pageSize,
      search,
      status,
      priority,
      boardId,
      assignedToId,
      sortBy,
      sortOrder,
      dueDateFilter,
    } = filters;

    // Build where clause with company filtering
    const where: any = {
      companyId, // Always filter by company
    };

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (boardId) {
      where.boardId = boardId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Due date filtering
    if (dueDateFilter) {
      const now = new Date();
      switch (dueDateFilter) {
        case "overdue":
          where.dueDate = { lt: now };
          where.status = { notIn: ["COMPLETED", "CANCELLED"] };
          break;
        case "today":
          const startOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          where.dueDate = { gte: startOfDay, lt: endOfDay };
          break;
        case "week":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          where.dueDate = { gte: now, lte: weekFromNow };
          break;
        case "month":
          const monthFromNow = new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
          );
          where.dueDate = { gte: now, lte: monthFromNow };
          break;
      }
    }

    // Build orderBy
    let orderBy: any = {};
    switch (sortBy) {
      case "title":
        orderBy = { title: sortOrder };
        break;
      case "status":
        orderBy = { status: sortOrder };
        break;
      case "priority":
        // Custom priority ordering
        orderBy = { priority: sortOrder };
        break;
      case "dueDate":
        orderBy = { dueDate: sortOrder };
        break;
      case "createdAt":
        orderBy = { createdAt: sortOrder };
        break;
      case "updatedAt":
      default:
        orderBy = { updatedAt: sortOrder };
        break;
    }

    // Execute queries in parallel
    const [tasks, totalCount, statusCounts, priorityCounts, overdueCount] =
      await Promise.all([
        // Main task query with pagination
        db.task.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            board: {
              select: {
                id: true,
                title: true,
              },
            },
            section: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),

        // Total count for pagination
        db.task.count({ where }),

        // Status counts for summary
        db.task.groupBy({
          by: ["status"],
          where: { companyId },
          _count: { id: true },
        }),

        // Priority counts for summary
        db.task.groupBy({
          by: ["priority"],
          where: { companyId },
          _count: { id: true },
        }),

        // Overdue count
        db.task.count({
          where: {
            companyId,
            dueDate: { lt: new Date() },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
      ]);

    // Transform tasks data
    const now = new Date();
    const transformedTasks: TaskTableRow[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskTableRow["status"],
      priority: task.priority as TaskTableRow["priority"],
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      assignedTo: task.assignedTo,
      creator: task.creator,
      board: task.board,
      section: task.section,
      isOverdue: task.dueDate
        ? task.dueDate < now &&
          !["COMPLETED", "CANCELLED"].includes(task.status)
        : false,
    }));

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Transform status counts
    const statusCountsMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.status as keyof TaskTableData["summary"]["statusCounts"]] =
          item._count.id;
        return acc;
      },
      {
        NEW: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }
    );

    // Transform priority counts
    const priorityCountsMap = priorityCounts.reduce(
      (acc, item) => {
        acc[item.priority as keyof TaskTableData["summary"]["priorityCounts"]] =
          item._count.id;
        return acc;
      },
      {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      }
    );

    const result: TaskTableData = {
      tasks: transformedTasks,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters,
      summary: {
        totalTasks: totalCount,
        statusCounts: statusCountsMap,
        priorityCounts: priorityCountsMap,
        overdueTasks: overdueCount,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid filter parameters" };
    }
    console.error("Task table data error:", error);
    return { error: "Failed to retrieve task data" };
  }
}
```

### Step 2: Create Task Data Table Component

Create `components/dashboard/tables/task-data-table.tsx`:

```typescript
"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  Folder,
  AlertTriangle,
} from "lucide-react"
import { getTaskTableData, type TaskTableData, type TaskTableRow } from "@/actions/dashboard/get-task-table-data"
import { cn } from "@/lib/utils"

interface TaskDataTableProps {
  boardId?: string
  className?: string
}

export function TaskDataTable({ boardId, className }: TaskDataTableProps) {
  const [data, setData] = useState<TaskTableData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [dueDateFilter, setDueDateFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("updatedAt")
  const [sortOrder, setSortOrder] = useState<string>("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: any = {
        page: currentPage,
        pageSize: 10,
        sortBy,
        sortOrder,
        ...(boardId && { boardId }),
      }

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim()
      }

      if (statusFilter !== "all") {
        filters.status = statusFilter
      }

      if (priorityFilter !== "all") {
        filters.priority = priorityFilter
      }

      if (dueDateFilter !== "all") {
        filters.dueDateFilter = dueDateFilter
      }

      const result = await getTaskTableData(filters)

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setData(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch task table data:', err)
      setError('Failed to load task data')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, statusFilter, priorityFilter, dueDateFilter, sortBy, sortOrder, boardId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const getStatusBadgeVariant = (status: TaskTableRow['status']) => {
    switch (status) {
      case 'NEW':
        return 'secondary'
      case 'IN_PROGRESS':
        return 'default'
      case 'ON_HOLD':
        return 'outline'
      case 'COMPLETED':
        return 'secondary'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getPriorityColor = (priority: TaskTableRow['priority']) => {
    switch (priority) {
      case 'LOW':
        return 'text-green-600'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'HIGH':
        return 'text-orange-600'
      case 'CRITICAL':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  )

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Task Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Task Data
        </CardTitle>
        <CardDescription>
          Manage and review all tasks across your organization
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">
              Total: {data.summary.totalTasks}
            </Badge>
            <Badge variant="secondary">
              Active: {data.summary.statusCounts.NEW + data.summary.statusCounts.IN_PROGRESS + data.summary.statusCounts.ON_HOLD}
            </Badge>
            <Badge variant="outline">
              Completed: {data.summary.statusCounts.COMPLETED}
            </Badge>
            {data.summary.overdueTasks > 0 && (
              <Badge variant="destructive">
                Overdue: {data.summary.overdueTasks}
              </Badge>
            )}
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="title">Task</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <SortableHeader column="priority">Priority</SortableHeader>
                <TableHead>Assigned To</TableHead>
                <TableHead>Board</TableHead>
                <SortableHeader column="dueDate">Due Date</SortableHeader>
                <SortableHeader column="updatedAt">Updated</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : data && data.tasks.length > 0 ? (
                data.tasks.map((task) => (
                  <TableRow key={task.id} className={cn(task.isOverdue && "bg-red-50 dark:bg-red-950/20")}>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-medium truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-1", getPriorityColor(task.priority))}>
                        {task.priority === 'CRITICAL' && <AlertTriangle className="h-3 w-3" />}
                        <span className="text-sm">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {task.assignedTo.name?.charAt(0) || task.assignedTo.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-24">
                            {task.assignedTo.name || task.assignedTo.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium truncate max-w-32">{task.board.title}</div>
                        {task.section && (
                          <div className="text-xs text-muted-foreground truncate">
                            {task.section.title}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("text-sm", task.isOverdue && "text-red-600 font-medium")}>
                        {formatDate(task.dueDate)}
                        {task.isOverdue && (
                          <div className="text-xs text-red-600">Overdue</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(task.updatedAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tasks found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
              ({data.pagination.total} total tasks)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!data.pagination.hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!data.pagination.hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Step 3: Update Dashboard Page

Replace the mock data table in dashboard page:

```typescript
// Update app/(app)/[cid]/dashboard/page.tsx
import { TaskDataTable } from "@/components/dashboard/tables/task-data-table"

// Add to the dashboard layout:
<div className="space-y-6">
  {/* Existing metrics and charts... */}

  {/* Replace existing data table with: */}
  <Suspense fallback={<div>Loading task data...</div>}>
    <TaskDataTable className="w-full" />
  </Suspense>
</div>
```

## Testing and Verification

### Manual Testing Checklist

- [ ] Table loads with real task data
- [ ] Search functionality works across title and description
- [ ] All filters (status, priority, due date) function correctly
- [ ] Sorting works on all sortable columns
- [ ] Pagination displays correct data
- [ ] Company data isolation enforced
- [ ] Overdue tasks highlighted properly
- [ ] Responsive design works on mobile

### Performance Testing

- [ ] Table loads within 2 seconds with 100+ tasks
- [ ] Pagination doesn't cause excessive re-renders
- [ ] Filter changes are responsive
- [ ] No memory leaks during navigation

## Completion Checklist

### Build & Quality

- [ ] `pnpm build` passes without errors
- [ ] `pnpm lint` passes without warnings
- [ ] TypeScript compilation successful
- [ ] Table renders correctly in all states

### Security & Data

- [ ] Server action validates session and company ID
- [ ] All database queries filter by `cid`
- [ ] Input validation with Zod schemas implemented
- [ ] Pagination parameters validated

### Performance & Database

- [ ] Database queries optimized with proper indexes
- [ ] Server-side pagination implemented
- [ ] No N+1 query problems
- [ ] Connection uses centralized `@/lib/db`

## Files Created/Modified

### New Files

- `actions/dashboard/get-task-table-data.ts`
- `components/dashboard/tables/task-data-table.tsx`

### Modified Files

- `app/(app)/[cid]/dashboard/page.tsx`

## Next Phase Preparation

Phase 3B will add:

- Advanced table filtering with multi-select
- Bulk operations (status updates, assignments)
- Task details drawer/modal
- Export functionality
- Real-time updates

This completes Phase 3A with a fully functional, real-data task table replacing the mock implementation.
