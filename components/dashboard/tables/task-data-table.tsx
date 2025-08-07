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
  ArrowUpDown,
  AlertTriangle,
  Folder,
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
  const [statusFilter, setStatusFilter] = useState<string | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<string | "all">("all")
  const [dueDateFilter, setDueDateFilter] = useState<string | "all">("all")
  const [sortBy, setSortBy] = useState<"title" | "status" | "priority" | "dueDate" | "createdAt" | "updatedAt">("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const filters: {
        page: number;
        pageSize: number;
        sortBy: "title" | "status" | "priority" | "dueDate" | "createdAt" | "updatedAt";
        sortOrder: "asc" | "desc";
        boardId?: string;
        search?: string;
        status?: "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
        priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        dueDateFilter?: "overdue" | "today" | "week" | "month";
      } = {
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
        filters.status = statusFilter as "NEW" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
      }

      if (priorityFilter !== "all") {
        filters.priority = priorityFilter as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      }

      if (dueDateFilter !== "all") {
        filters.dueDateFilter = dueDateFilter as "overdue" | "today" | "week" | "month"
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

  const handleSort = (column: "title" | "status" | "priority" | "dueDate" | "createdAt" | "updatedAt") => {
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

  const SortableHeader = ({ column, children }: { column: "title" | "status" | "priority" | "dueDate" | "createdAt" | "updatedAt"; children: React.ReactNode }) => (
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
                        <div className="text-sm font-medium truncate max-w-32">{task.board.name}</div>
                        {task.section && (
                          <div className="text-xs text-muted-foreground truncate">
                            {task.section.name}
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