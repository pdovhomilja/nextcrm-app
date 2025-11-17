"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskDataTableServer } from "./task-data-table-server";
import { BulkUpdateToolbar } from "@/components/bulk-due-date/bulk-update-toolbar";
import { bulkUpdateDueDates } from "@/actions/tasks/bulk-update-due-dates";
import { toast } from "sonner";
import { User } from "@/lib/generated/prisma";

interface TaskTableWithSelectionProps {
  boardId?: string;
  className?: string;
  user: User;
  searchParams: Record<string, string | string[] | undefined>;
  companyId?: string;
}

/**
 * Client component wrapper that adds selection and bulk update capabilities
 * to the TaskDataTableServer component
 */
export function TaskTableWithSelection({
  boardId,
  className,
  user,
  searchParams,
  companyId,
}: TaskTableWithSelectionProps) {
  const router = useRouter();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );

  /**
   * Toggle selection for an individual task
   */
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

  /**
   * Toggle selection for all visible tasks on current page
   */
  const handleToggleAllSelection = (taskIds: string[], selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        // Add all task IDs
        taskIds.forEach((id) => next.add(id));
      } else {
        // Remove all task IDs
        taskIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  /**
   * Clear all selections
   */
  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  /**
   * Handle bulk due date update
   */
  const handleBulkUpdate = async (newDueDate: Date) => {
    if (!companyId) {
      toast.error("Company ID is required for bulk updates");
      return;
    }

    if (selectedTaskIds.size === 0) {
      toast.error("No tasks selected");
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Updating task due dates...");

    try {
      const response = await bulkUpdateDueDates({
        taskIds: Array.from(selectedTaskIds),
        newDueDate,
        companyId,
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.success) {
        // Show success toast
        toast.success(
          response.message ||
            `Successfully updated ${response.updatedCount} task(s) with new due date`
        );

        // Clear selection
        handleClearSelection();

        // Refresh table to show updated data
        router.refresh();
      } else {
        // Show error toast
        toast.error(
          `Failed to update task due dates: ${response.error || "Unknown error"}`
        );
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);

      console.error("Error during bulk update:", error);
      toast.error(
        `Failed to update task due dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <>
      <TaskDataTableServer
        boardId={boardId}
        className={className}
        user={user}
        searchParams={searchParams}
        companyId={companyId}
      />

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
