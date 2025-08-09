"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { editTask, type EditTaskInput } from "@/actions/tasks/edit-task";
import type { Task } from "../../_types";
import { Textarea } from "@/components/ui/textarea";

const TaskActions = ({ task }: { task: Task }) => {
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [isDuePopoverOpen, setIsDuePopoverOpen] = useState(false);

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
      form.reset({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ?? new Date(),
        status: task.status as
          | "NEW"
          | "IN_PROGRESS"
          | "COMPLETED"
          | "CANCELLED"
          | "ON_HOLD",
        priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      });
      // Align the visible month with the current due date (or today)
      setMonth(task.dueDate ?? new Date());
      setIsDuePopoverOpen(false);
    }
  }, [isEditOpen, task, form]);

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
      setOnDelete(false);
      router.refresh();
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const onSubmit = async (data: FormValues) => {
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
  };

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
          <DropdownMenuItem onClick={() => setOnDelete(true)}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete Task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Task
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
                        <Textarea {...field} placeholder="Description" rows={4} />
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
                            {field.value ? format(field.value, "PPP") : "Pick a due date"}
                            <span className="ml-2 text-muted-foreground">▾</span>
                          </Button>
                          {isDuePopoverOpen && (
                            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-2 shadow-md">
                              <div className="flex items-center justify-between px-2 pb-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    setMonth(today);
                                    field.onChange(today);
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
                                  if (d) {
                                    // Prevent selecting past dates
                                    const startOfToday = new Date();
                                    startOfToday.setHours(0, 0, 0, 0);
                                    if (d < startOfToday) return;
                                  }
                                  field.onChange(d);
                                  setIsDuePopoverOpen(false);
                                }}
                                disabled={{
                                  before: (() => {
                                    const t = new Date();
                                    t.setHours(0, 0, 0, 0);
                                    return t;
                                  })(),
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
