"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const TaskActions = ({ task }: { task: Task }) => {
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(new Date());

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
                        <Input {...field} placeholder="Description" />
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Due date</CardTitle>
                          <CardDescription>Select when this task is due</CardDescription>
                          <CardAction>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const today = new Date();
                                setMonth(today);
                                field.onChange(today);
                              }}
                            >
                              Today
                            </Button>
                          </CardAction>
                        </CardHeader>
                        <CardContent>
                          <Calendar
                            mode="single"
                            month={month}
                            onMonthChange={setMonth}
                            selected={field.value}
                            onSelect={field.onChange}
                            className="bg-transparent p-0"
                          />
                        </CardContent>
                      </Card>
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
