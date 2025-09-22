"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, InfoIcon, LoaderIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { ReferenceTaskSelector } from "./reference-task-selector";
import { BulkDatePickerInput } from "./date-picker-input";
import {
  updateActiveTasksDueDate,
  getActiveTasksCount,
  getBoardTasksForReference,
} from "@/actions/tasks/update-active-tasks-due-date";
import { validateTaskDate } from "@/lib/utils/date-calculations";

// Form validation schema
const bulkDueDateSchema = z.object({
  referenceTaskId: z.string().min(1, "Please select a reference task"),
  newDueDate: z.date().refine(
    (date) => validateTaskDate(date).isValid,
    {
      message: "Please select a valid date within the allowed range",
    }
  ),
});

type BulkDueDateFormData = z.infer<typeof bulkDueDateSchema>;

interface BulkDueDateDialogProps {
  boardId: string;
  boardName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkDueDateDialog({
  boardId,
  boardName,
  isOpen,
  onOpenChange,
}: BulkDueDateDialogProps) {
  const [activeTaskCount, setActiveTaskCount] = useState<number | null>(null);
  const [taskCountError, setTaskCountError] = useState<string | null>(null);
  const [isLoadingTaskCount, setIsLoadingTaskCount] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceTask, setReferenceTask] = useState<{
    id: string;
    title: string;
    dueDate: Date;
  } | null>(null);

  const form = useForm<BulkDueDateFormData>({
    resolver: zodResolver(bulkDueDateSchema),
    defaultValues: {
      referenceTaskId: "",
      newDueDate: new Date(),
    },
  });

  const { watch, reset } = form;
  const watchedValues = watch();

  // Load active task count when dialog opens or boardId changes
  useEffect(() => {
    if (!isOpen || !boardId) return;

    let isMounted = true;

    const loadTaskCount = async () => {
      setIsLoadingTaskCount(true);
      setTaskCountError(null);

      try {
        const result = await getActiveTasksCount(boardId);

        if (!isMounted) return;

        if (result.error) {
          setTaskCountError(result.error);
          setActiveTaskCount(null);
        } else {
          setActiveTaskCount(result.count);
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Error loading task count:", error);
        setTaskCountError("Failed to load task information");
        setActiveTaskCount(null);
      } finally {
        if (isMounted) {
          setIsLoadingTaskCount(false);
        }
      }
    };

    loadTaskCount();

    return () => {
      isMounted = false;
    };
  }, [isOpen, boardId]);

  // Load reference task details when reference task ID changes
  useEffect(() => {
    if (!watchedValues.referenceTaskId) {
      setReferenceTask(null);
      return;
    }

    const loadReferenceTask = async () => {
      try {
        const result = await getBoardTasksForReference(boardId);
        if (result.error) return;

        const task = result.tasks.find(t => t.id === watchedValues.referenceTaskId);
        if (task) {
          setReferenceTask({
            id: task.id,
            title: task.title,
            dueDate: new Date(task.dueDate),
          });
        }
      } catch (error) {
        console.error("Error loading reference task:", error);
      }
    };

    loadReferenceTask();
  }, [watchedValues.referenceTaskId, boardId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset();
      setReferenceTask(null);
    }
  }, [isOpen, reset]);

  // Handle form submission (shows confirmation dialog)
  const onSubmit = () => {
    setIsConfirmationOpen(true);
  };

  // Handle confirmed submission
  const handleConfirmedSubmit = async () => {
    if (!watchedValues.referenceTaskId || !watchedValues.newDueDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateActiveTasksDueDate({
        boardId,
        referenceTaskId: watchedValues.referenceTaskId,
        newDueDate: watchedValues.newDueDate,
      });

      if (result.success) {
        toast.success(result.message || "Successfully updated tasks");
        setIsConfirmationOpen(false);
        onOpenChange(false);
        reset();
      } else {
        toast.error(result.error || "Failed to update tasks");
      }
    } catch (error) {
      console.error("Error updating tasks:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid and ready to submit
  const isFormValid = watchedValues.referenceTaskId && watchedValues.newDueDate && !form.formState.errors.referenceTaskId && !form.formState.errors.newDueDate;

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Update Due Dates
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <div>
                Update due dates for active tasks in <strong>{boardName}</strong>
              </div>
              {isLoadingTaskCount && (
                <div className="flex items-center gap-2 text-sm" aria-live="polite">
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  Loading task information...
                </div>
              )}
              {taskCountError && (
                <div className="text-destructive text-sm" role="alert">
                  Error loading task information
                </div>
              )}
              {activeTaskCount !== null && activeTaskCount === 0 && (
                <div className="text-muted-foreground text-sm" role="alert">
                  No active tasks found in this board
                </div>
              )}
              {activeTaskCount !== null && activeTaskCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {activeTaskCount} active task{activeTaskCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Form Content */}
          {activeTaskCount !== null && activeTaskCount > 0 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Reference Task Selection */}
                <FormField
                  control={form.control}
                  name="referenceTaskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Task</FormLabel>
                      <ReferenceTaskSelector
                        boardId={boardId}
                        selectedTaskId={field.value}
                        onTaskSelect={field.onChange}
                        disabled={isSubmitting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Selection */}
                <FormField
                  control={form.control}
                  name="newDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Due Date</FormLabel>
                      <BulkDatePickerInput
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                        label="New Due Date"
                        placeholder="Select new date for reference task"
                        referenceDate={referenceTask?.dueDate}
                        showDateDifference={!!referenceTask}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Help Information */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <InfoIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="font-medium">How it works:</div>
                        <ul className="space-y-1 text-xs">
                          <li>• All active tasks will maintain their relative time differences</li>
                          <li>• If Task A was due 2 days after the reference task, it will still be due 2 days after the new date</li>
                          <li>• COMPLETED and CANCELLED tasks will not be affected</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dialog Footer */}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                  >
                    Update Tasks
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                Are you sure you want to update due dates for all active tasks in this board?
              </div>

              {referenceTask && watchedValues.newDueDate && (
                <Card className="text-left">
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Board:</span>
                        <span>{boardName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Active Tasks:</span>
                        <Badge variant="secondary">
                          {activeTaskCount} task{activeTaskCount !== 1 ? 's' : ''} will be updated
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Reference Task:</span>
                        <span className="truncate max-w-[200px]">{referenceTask.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">New Date:</span>
                        <span>{format(watchedValues.newDueDate, "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-xs text-muted-foreground">
                This action cannot be undone. All changes will be logged in task history.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating tasks..." : "Confirm Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BulkDueDateDialog;