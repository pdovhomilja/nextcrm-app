"use client";

import { useState, useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Check } from "lucide-react";
import { markDone } from "@/actions/tasks/mark-done";
import type { TaskTableRow } from "@/actions/dashboard/get-task-table-data";

interface TaskRowActionsProps {
  taskId: string;
  status: TaskTableRow["status"];
}

export function TaskRowActions({ taskId, status }: TaskRowActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleMarkDone = async () => {
    if (status === "COMPLETED") return;

    setIsLoading(true);
    startTransition(async () => {
      try {
        await markDone(taskId);
      } catch (error) {
        console.error("Failed to mark task as done:", error);
      } finally {
        setIsLoading(false);
      }
    });
  };

  if (status === "COMPLETED") {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Check className="h-4 w-4 mr-1 text-green-500" />
        Done
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 cursor-pointer"
          role="button"
          tabIndex={0}
        >
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleMarkDone}
          disabled={isLoading || isPending}
        >
          <Check className="h-4 w-4 mr-2" />
          Mark as Done
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
