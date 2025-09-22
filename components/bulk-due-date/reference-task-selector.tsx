"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { getBoardTasksForReference } from "@/actions/tasks/update-active-tasks-due-date";
import { cn } from "@/lib/utils";

interface TaskInfo {
  id: string;
  title: string;
  dueDate: Date;
  status: string;
}

interface ReferenceTaskSelectorProps {
  boardId: string;
  selectedTaskId?: string;
  onTaskSelect: (taskId: string) => void;
  disabled?: boolean;
  className?: string;
}

const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  IN_PROGRESS: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  ON_HOLD: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
} as const;

const STATUS_LABELS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
} as const;

export function ReferenceTaskSelector({
  boardId,
  selectedTaskId,
  onTaskSelect,
  disabled = false,
  className,
}: ReferenceTaskSelectorProps) {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks when boardId changes
  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      if (!boardId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await getBoardTasksForReference(boardId);

        if (!isMounted) return;

        if (result.error) {
          setError(result.error);
          setTasks([]);
        } else {
          setTasks(result.tasks);
        }
      } catch (err) {
        if (!isMounted) return;

        console.error("Error loading tasks:", err);
        setError("Failed to load tasks");
        setTasks([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [boardId]);

  // Sort tasks by due date (earliest first), then by title
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  // Find selected task for display
  const selectedTask = useMemo(() => {
    return selectedTaskId ? tasks.find(task => task.id === selectedTaskId) : null;
  }, [selectedTaskId, tasks]);

  // Format date for display
  const formatTaskDate = (date: Date) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Render content based on state
  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-full", className)} aria-label="Select reference task">
          <SelectValue>
            <div className="flex items-center gap-2" aria-live="polite">
              <ClockIcon className="h-4 w-4 animate-spin" />
              Loading tasks...
            </div>
          </SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-full border-destructive", className)} aria-label="Select reference task">
          <SelectValue>
            <span className="text-destructive">Error loading tasks</span>
          </SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  if (tasks.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-full", className)} aria-label="Select reference task">
          <SelectValue>
            <span className="text-muted-foreground">No active tasks available</span>
          </SelectValue>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={selectedTaskId}
      onValueChange={onTaskSelect}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)} aria-label="Select reference task">
        <SelectValue placeholder="Select reference task">
          {selectedTask && (
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{selectedTask.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Due: {formatTaskDate(selectedTask.dueDate)}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2 text-xs",
                  STATUS_COLORS[selectedTask.status as keyof typeof STATUS_COLORS]
                )}
              >
                {STATUS_LABELS[selectedTask.status as keyof typeof STATUS_LABELS] || selectedTask.status}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-full">
        {sortedTasks.map((task) => (
          <SelectItem
            key={task.id}
            value={task.id}
            className="cursor-pointer"
            data-testid={`task-option-${task.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex-1 min-w-0 mr-3">
                <div className="font-medium truncate">{task.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <CalendarIcon className="h-3 w-3" />
                  Due: {formatTaskDate(task.dueDate)}
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs shrink-0",
                  STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
                )}
              >
                {STATUS_LABELS[task.status as keyof typeof STATUS_LABELS] || task.status}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ReferenceTaskSelector;