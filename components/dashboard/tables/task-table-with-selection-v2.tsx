"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BulkUpdateToolbar } from "@/components/bulk-due-date/bulk-update-toolbar";
import { bulkUpdateDueDates } from "@/actions/tasks/bulk-update-due-dates";
import { toast } from "sonner";
import { User } from "@/lib/generated/prisma";
import {
  getTaskTableData,
  type TaskTableData,
} from "@/actions/dashboard/get-task-table-data";
import { taskTableSearchParams } from "@/app/(app)/[cid]/tasks-list/search-params";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TaskTableFilters, SortableHeader } from "./task-table-filters";
import { TaskRowActions } from "./task-list-actions";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskTableWithSelectionV2Props {
  boardId?: string;
  className?: string;
  user: User;
  searchParams: Record<string, string | string[] | undefined>;
  companyId?: string;
  activeCompanyId?: string;
}

/**
 * Fully client-side component that handles data fetching, selection, and bulk updates
 */
export function TaskTableWithSelectionV2({
  boardId,
  className,
  user, // eslint-disable-line @typescript-eslint/no-unused-vars
  searchParams,
  companyId,
  activeCompanyId,
}: TaskTableWithSelectionV2Props) {
  const router = useRouter();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [data, setData] = useState<TaskTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount and when searchParams change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

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
        const effectiveCompanyId = companyId || activeCompanyId;

        if (!effectiveCompanyId) {
          setError("Company context required");
          setLoading(false);
          return;
        }

        const filters = {
          page,
          pageSize,
          sortBy,
          sortOrder,
          companyId: effectiveCompanyId,
          ...(boardId && { boardId }),
          ...(search && search.trim() && { search: search.trim() }),
          ...(status !== "all" && { status: status as "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED" }),
          ...(priority !== "all" && { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }),
          ...(dueDate !== "all" && { dueDateFilter: dueDate as "overdue" | "today" | "week" | "month" }),
        };

        const result = await getTaskTableData(filters);

        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data || null);
        }
      } catch (err) {
        console.error("Failed to fetch task table data:", err);
        setError("Failed to load task data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchParams, boardId, companyId, activeCompanyId]);

  const handleToggleSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleToggleAllSelection = (taskIds: string[], selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        taskIds.forEach((id) => next.add(id));
      } else {
        taskIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkUpdate = async (newDueDate: Date) => {
    const taskIds = Array.from(selectedTaskIds);
    const effectiveCompanyId = companyId || activeCompanyId;

    if (!effectiveCompanyId) {
      toast.error("Company ID is required for bulk update");
      return;
    }

    if (taskIds.length === 0) {
      toast.error("Please select at least one task to update");
      return;
    }

    const loadingToast = toast.loading(
      `Updating ${taskIds.length} task(s)...`
    );

    try {
      const result = await bulkUpdateDueDates({
        taskIds,
        newDueDate,
        companyId: effectiveCompanyId,
      });

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(
          result.message || `Successfully updated ${result.updatedCount} task(s)`
        );
        setSelectedTaskIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update tasks");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error during bulk update:", error);
      toast.error(
        `Failed to update task due dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  if (loading) {
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
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Task Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 p-4 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Task Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-4 text-center">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskIds = data.tasks.map((task) => task.id);
  const allSelected =
    taskIds.length > 0 && taskIds.every((id) => selectedTaskIds.has(id));
  const someSelected =
    taskIds.some((id) => selectedTaskIds.has(id)) && !allSelected;

  return (
    <>
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
                href={`/${activeCompanyId || companyId}/tasks-list?dueDate=today`}
              >
                <Badge variant="default">Today: {data.summary.todayTasks}</Badge>
              </Link>
            )}
            {data.summary.overdueTasks > 0 && (
              <Link
                href={`/${activeCompanyId || companyId}/tasks-list?dueDate=overdue`}
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={someSelected ? "indeterminate" : allSelected}
                        onCheckedChange={(checked) => {
                          handleToggleAllSelection(taskIds, !!checked);
                        }}
                        aria-label="Select all tasks on this page"
                      />
                    </div>
                  </TableHead>
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
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selectedTaskIds.has(task.id)}
                            onCheckedChange={() => handleToggleSelection(task.id)}
                            aria-label={`Select task ${task.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-medium truncate">
                            <Link
                              href={`/${activeCompanyId || companyId}/tasks-list/${task.id}`}
                            >
                              {task.title}
                            </Link>
                          </div>
                          {task.description && (
                            <div className="text-sm text-muted-foreground truncate">
                              <HoverCard>
                                <HoverCardTrigger>
                                  {task.description}
                                </HoverCardTrigger>
                                <HoverCardContent className="text-xs">
                                  {task.description}
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>{task.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                              href={`/${activeCompanyId || companyId}/tasks/${task.board.id}`}
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
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                          {task.isOverdue && (
                            <div className="text-xs text-red-600">Overdue</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {task.updatedAt
                            ? new Date(task.updatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
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
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No tasks found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Show bulk update toolbar when tasks are selected */}
      {selectedTaskIds.size > 0 && (
        <BulkUpdateToolbar
          selectedCount={selectedTaskIds.size}
          onUpdate={handleBulkUpdate}
          onCancel={handleClearSelection}
        />
      )}
    </>
  );
}
