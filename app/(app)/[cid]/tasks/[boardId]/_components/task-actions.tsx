"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  CheckIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteTask } from "@/actions/tasks/delete-task";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod/v3";
import { zodResolver } from "@hookform/resolvers/zod";
import { editTask, type EditTaskInput } from "@/actions/tasks/edit-task";
import type { Task } from "../../_types";
import { Textarea } from "@/components/ui/textarea";
import { markDone } from "@/actions/tasks/mark-done";
import { useParams } from "next/navigation";

const TaskActions = ({ task }: { task: Task }) => {
  const { cid } = useParams();
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [isDuePopoverOpen, setIsDuePopoverOpen] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  // Memoize expensive date calculations
  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    dueDate: z.date().optional(),
    status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  });

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      status: "NEW",
      priority: "MEDIUM",
    },
  });

  useEffect(() => {
    if (isEditOpen) {
      // Batch state updates to prevent multiple renders
      const resetData = {
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ?? startOfToday,
        status: task.status as
          | "NEW"
          | "IN_PROGRESS"
          | "COMPLETED"
          | "CANCELLED"
          | "ON_HOLD",
        priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      };
      
      // Use setTimeout to ensure smooth transition and prevent conflicts
      const timeoutId = setTimeout(() => {
        form.reset(resetData);
        setMonth(task.dueDate ?? startOfToday);
        setIsDuePopoverOpen(false);
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isEditOpen, task, form, startOfToday]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteTask(task.id);
      setOnDelete(false);
      router.refresh();
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  }, [task.id, router]);

  const onSubmit = useCallback(async (data: FormValues) => {
    try {
      const payload: EditTaskInput = {
        title: data.title,
        description: data.description ?? "",
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ?? null,
      };
      await editTask(task.id, payload);
      toast.success("Task updated");
      setIsEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update task");
    }
  }, [task.id, router]);

  if (onDelete) {
    return (
      <Dialog open={onDelete} onOpenChange={setOnDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task - {task.title}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this task?
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreHorizontalIcon size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" side="bottom">
          <DropdownMenuItem
            onClick={() => {
              router.push(`/${cid}/tasks-list/${task.id}`);
            }}
          >
            <EyeIcon className="mr-2 h-4 w-4" />
            View Task Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOnDelete(true)}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete Task
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              // Add small delay to let dropdown close completely before opening sheet
              setTimeout(() => setIsEditOpen(true), 100);
            }}
          >
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Task
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isMarkingDone}
            onSelect={async () => {
              if (isMarkingDone) return;
              try {
                setIsMarkingDone(true);
                await markDone(task.id);
                router.refresh();
                toast.success("Task marked as done");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to mark task as done"
                );
              } finally {
                setIsMarkingDone(false);
              }
            }}
          >
            <CheckIcon className="mr-2 h-4 w-4" />
            Mark as Done
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
            <SheetDescription>Update task details.</SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Description"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDuePopoverOpen((v) => !v)}
                            className="min-w-40 justify-between"
                          >
                            {field.value
                              ? format(field.value, "PPP")
                              : "Pick a due date"}
                            <span className="ml-2 text-muted-foreground">
                              ▾
                            </span>
                          </Button>
                          {isDuePopoverOpen && (
                            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-2 shadow-md">
                              <div className="flex items-center justify-between px-2 pb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMonth(startOfToday);
                                    field.onChange(startOfToday);
                                  }}
                                >
                                  Today
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => field.onChange(undefined)}
                                >
                                  Clear
                                </Button>
                              </div>
                              <Calendar
                                mode="single"
                                month={month}
                                onMonthChange={setMonth}
                                selected={field.value}
                                onSelect={(d?: Date) => {
                                  if (d && d < startOfToday) {
                                    // Prevent selecting past dates
                                    return;
                                  }
                                  field.onChange(d);
                                  setIsDuePopoverOpen(false);
                                }}
                                disabled={{
                                  before: startOfToday,
                                }}
                                className="bg-transparent p-0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NEW">New</SelectItem>
                              <SelectItem value="IN_PROGRESS">
                                In Progress
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="CRITICAL">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)}>Save changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TaskActions;
