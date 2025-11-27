"use client";

import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { startTransition, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface TaskTableFiltersProps {
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function TaskTableFilters({
  currentPage,
  totalPages,
  hasPrev,
  hasNext,
}: TaskTableFiltersProps) {
  // Search and filtering
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  // Local state for immediate input updates during typing
  // Initialized from URL state; updates URL via debounced callback
  const [searchInput, setSearchInput] = useState(search ?? "");

  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault("all").withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  const [priority, setPriority] = useQueryState(
    "priority",
    parseAsString.withDefault("all").withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  const [dueDate, setDueDate] = useQueryState(
    "dueDate",
    parseAsString.withDefault("all").withOptions({
      shallow: false,
      startTransition,
      clearOnDefault: true,
    }),
  );

  // Pagination
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(10).withOptions({
      shallow: false,
      startTransition,
    }),
  );

  // Debounced search handler - waits 500ms after user stops typing
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value || null);
    // Reset to page 1 when searching
    if (page !== 1) {
      setPage(1);
    }
  }, 500);

  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === "all" ? null : value);
    // Reset to page 1 when filtering
    if (page !== 1) {
      setPage(1);
    }
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value === "all" ? null : value);
    // Reset to page 1 when filtering
    if (page !== 1) {
      setPage(1);
    }
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value === "all" ? null : value);
    // Reset to page 1 when filtering
    if (page !== 1) {
      setPage(1);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    setPageSize(newPageSize);
    // Reset to page 1 when changing page size
    if (page !== 1) {
      setPage(1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={status ?? "all"} onValueChange={handleStatusChange}>
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

          <Select
            value={priority ?? "all"}
            onValueChange={handlePriorityChange}
          >
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

          <Select value={dueDate ?? "all"} onValueChange={handleDueDateChange}>
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

      {/* Page Size and Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize?.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="1000">All</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={!hasNext}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the sort handler for use in table headers
export function useSortHandler() {
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsString.withDefault("updatedAt").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const [sortOrder, setSortOrder] = useQueryState(
    "sortOrder",
    parseAsString.withDefault("desc").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const handleSort = (
    column:
      | "title"
      | "status"
      | "priority"
      | "dueDate"
      | "createdAt"
      | "updatedAt",
  ) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    // Reset to page 1 when sorting
    if (page !== 1) {
      setPage(1);
    }
  };

  return { sortBy, sortOrder, handleSort };
}

// Client component for sortable table headers
export function SortableHeader({
  column,
  children,
}: {
  column:
    | "title"
    | "status"
    | "priority"
    | "dueDate"
    | "createdAt"
    | "updatedAt";
  children: React.ReactNode;
}) {
  const { handleSort } = useSortHandler();

  return (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </TableHead>
  );
}
