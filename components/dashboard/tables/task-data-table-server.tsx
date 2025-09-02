import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Folder } from "lucide-react";
import {
  getTaskTableData,
  type TaskTableData,
  type TaskTableRow,
} from "@/actions/dashboard/get-task-table-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { User } from "@/lib/generated/prisma";
import { TaskTableFilters, SortableHeader } from "./task-table-filters";
import { taskTableSearchParams } from "@/app/(app)/[cid]/tasks-list/search-params";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { TaskRowActions } from "./task-list-actions";

interface TaskDataTableServerProps {
  boardId?: string;
  className?: string;
  user: User;
  searchParams: Record<string, string | string[] | undefined>;
}

// Server component for data fetching
async function TaskDataTableContent({
  boardId,
  user,
  searchParams,
}: Omit<TaskDataTableServerProps, "className">) {
  const session = await auth();
  // Parse search params using nuqs server-side parsing
  const {
    search,
    status,
    priority,
    dueDate,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = taskTableSearchParams.parse(searchParams);

  try {
    const filters: {
      page: number;
      pageSize: number;
      sortBy:
        | "title"
        | "status"
        | "priority"
        | "dueDate"
        | "createdAt"
        | "updatedAt";
      sortOrder: "asc" | "desc";
      boardId?: string;
      search?: string;
      status?: "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      dueDateFilter?: "overdue" | "today" | "week" | "month";
    } = {
      page,
      pageSize,
      sortBy,
      sortOrder,
    };

    // Only add boardId if it's provided from props (not from URL params in this case)
    if (boardId) {
      filters.boardId = boardId;
    }

    if (search && search.trim()) {
      filters.search = search.trim();
    }

    if (status !== "all") {
      filters.status = status as
        | "NEW"
        | "IN_PROGRESS"
        | "ON_HOLD"
        | "COMPLETED"
        | "CANCELLED";
    }

    if (priority !== "all") {
      filters.priority = priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    }

    if (dueDate !== "all") {
      filters.dueDateFilter = dueDate as "overdue" | "today" | "week" | "month";
    }

    const result = await getTaskTableData(filters);

    if (result.error) {
      return (
        <div className="text-sm text-red-600 p-4 text-center">
          {result.error}
        </div>
      );
    }

    if (!result.data) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No data available
        </div>
      );
    }

    const data = result.data;

    return (
      <>
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">Total: {data.summary.totalTasks}</Badge>
          <Badge variant="secondary">
            Active:{" "}
            {data.summary.statusCounts.NEW +
              data.summary.statusCounts.IN_PROGRESS +
              data.summary.statusCounts.ON_HOLD}
          </Badge>
          <Badge variant="outline">
            Completed: {data.summary.statusCounts.COMPLETED}
          </Badge>
          {data.summary.todayTasks > 0 && (
            <Link
              href={`/${session?.user?.activeCompanyId}/tasks-list?dueDate=today`}
            >
              <Badge variant="default">Today: {data.summary.todayTasks}</Badge>
            </Link>
          )}
          {data.summary.overdueTasks > 0 && (
            <Link
              href={`/${session?.user?.activeCompanyId}/tasks-list?dueDate=overdue`}
            >
              <Badge variant="destructive">
                Overdue: {data.summary.overdueTasks}
              </Badge>
            </Link>
          )}
        </div>

        {/* Filters */}
        <TaskTableFilters
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          hasPrev={data.pagination.hasPrev}
          hasNext={data.pagination.hasNext}
        />

        {/* Table */}
        <TaskTable data={data} user={user} session={session} />
      </>
    );
  } catch (err) {
    console.error("Failed to fetch task table data:", err);
    return (
      <div className="text-sm text-red-600 p-4 text-center">
        Failed to load task data
      </div>
    );
  }
}

// Server component for table rendering
function TaskTable({
  data,

  session,
}: {
  data: TaskTableData;
  user: User;
  session: Session | null;
}) {
  const getStatusBadgeVariant = (status: TaskTableRow["status"]) => {
    switch (status) {
      case "NEW":
        return "secondary";
      case "IN_PROGRESS":
        return "default";
      case "ON_HOLD":
        return "outline";
      case "COMPLETED":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPriorityColor = (priority: TaskTableRow["priority"]) => {
    switch (priority) {
      case "LOW":
        return "text-green-600";
      case "MEDIUM":
        return "text-yellow-600";
      case "HIGH":
        return "text-orange-600";
      case "CRITICAL":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.tasks.length > 0 ? (
            data.tasks.map((task) => (
              <TableRow
                key={task.id}
                className={cn(task.isOverdue && "bg-red-50 dark:bg-red-950/20")}
              >
                <TableCell className="max-w-xs">
                  <div className="space-y-1">
                    <div className="font-medium truncate">
                      <Link
                        href={`/${session?.user?.activeCompanyId}/tasks-list/${task.id}`}
                      >
                        {task.title}
                      </Link>
                    </div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground truncate">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(task.status)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      getPriorityColor(task.priority)
                    )}
                  >
                    {task.priority === "CRITICAL" && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span className="text-sm">{task.priority}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {task.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {task.assignedTo.name?.charAt(0) ||
                            task.assignedTo.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate max-w-24">
                        {task.assignedTo.name || task.assignedTo.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm font-medium truncate max-w-32">
                      <Link
                        href={`/${session?.user?.activeCompanyId}/tasks/${task.board.id}`}
                      >
                        {task.board.name}
                      </Link>
                    </div>
                    {task.section && (
                      <div className="text-xs text-muted-foreground truncate">
                        {task.section.name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    className={cn(
                      "text-sm",
                      task.isOverdue && "text-red-600 font-medium"
                    )}
                  >
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
                <TableCell>
                  <TaskRowActions taskId={task.id} status={task.status} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-8 text-muted-foreground"
              >
                No tasks found matching your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Main server component
export function TaskDataTableServer({
  boardId,
  className,
  user,
  searchParams,
}: TaskDataTableServerProps) {
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
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              <div className="border rounded-lg">
                <div className="p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex gap-4 py-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <TaskDataTableContent
            boardId={boardId}
            user={user}
            searchParams={searchParams}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
