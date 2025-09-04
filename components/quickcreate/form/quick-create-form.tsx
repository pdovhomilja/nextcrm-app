"use client";

import React, { useEffect, useState, useMemo } from "react";
import { z } from "zod/v3";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getBoards } from "@/actions/tasks/get-boards";
import { getBoardSections } from "@/actions/tasks/get-board-sections";
import { createTask } from "@/actions/tasks/create-task";
import type {
  TaskPriority as TaskPriorityType,
  TaskStatus as TaskStatusType,
} from "@/app/(app)/[cid]/tasks/_types";
import { useSession } from "next-auth/react";
import { Board } from "@/lib/generated/prisma";
import type { BoardSection as UIBoardSection } from "@/app/(app)/[cid]/tasks/_types";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  boardId: z.string().min(1, "Board is required"),
  boardSectionId: z.string().min(1, "Board section is required"),
  dueDate: z.date().optional(),
  status: z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]), // TaskStatus
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), // TaskPriority
});

type FormValues = z.infer<typeof formSchema>;

interface EmailData {
  subject?: string;
  text?: string;
}

const QuickCreateForm = ({ emailData }: { emailData?: EmailData }) => {
  const { data: session } = useSession();
  const user = session?.user;
  //console.log("User:", user);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardSections, setBoardSections] = useState<UIBoardSection[]>([]);
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [isDuePopoverOpen, setIsDuePopoverOpen] = useState(false);
  const [boardSearchQuery, setBoardSearchQuery] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: emailData?.subject ?? "",
      description: emailData?.text ?? "",
      boardId: "",
      boardSectionId: "",
      status: "NEW",
      priority: "MEDIUM",
      dueDate: undefined,
    },
  });

  const selectedBoardId = form.watch("boardId");

  // Filter boards based on search query
  const filteredBoards = useMemo(() => {
    if (!boardSearchQuery.trim()) return boards;
    return boards.filter((board) =>
      board.name.toLowerCase().includes(boardSearchQuery.toLowerCase())
    );
  }, [boards, boardSearchQuery]);

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;
    setIsLoading(true);

    getBoards(user.id, undefined, user.activeCompanyId!)
      .then((fetchedBoards) => {
        if (isCancelled) return;
        setBoards(fetchedBoards);
        if (fetchedBoards.length && !form.getValues("boardId")) {
          form.setValue("boardId", fetchedBoards[0].id);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.id, form]);

  useEffect(() => {
    if (!selectedBoardId) {
      setBoardSections([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    getBoardSections(selectedBoardId)
      .then((sections) => {
        if (isCancelled) return;
        setBoardSections(sections);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBoardId]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const payload: {
      title: string;
      description: string;
      dueDate?: Date;
      status?: TaskStatusType;
      priority?: TaskPriorityType;
    } = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: data.status as TaskStatusType,
      priority: data.priority as TaskPriorityType,
    };

    await createTask(payload, data.boardSectionId);
    form.reset({
      title: "",
      description: "",
      boardId: selectedBoardId ?? "",
      boardSectionId: "",
      status: "NEW",
      priority: "MEDIUM",
      dueDate: undefined,
    });
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 h-full overflow-y-auto py-5">
        {/* Board selection skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Select trigger */}
        </div>

        {/* Board section skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Select trigger */}
        </div>

        {/* Title input skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-8" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>

        {/* Description textarea skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" /> {/* Label */}
          <Skeleton className="h-20 w-full" /> {/* Textarea */}
        </div>

        {/* Due date skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" /> {/* Label */}
          <Skeleton className="h-10 w-40" /> {/* Due date button */}
        </div>

        {/* Status and Priority skeleton grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" /> {/* Status label */}
            <Skeleton className="h-10 w-full" /> {/* Status select */}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" /> {/* Priority label */}
            <Skeleton className="h-10 w-full" /> {/* Priority select */}
          </div>
        </div>

        {/* Submit button skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24" /> {/* Submit button */}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 p-4 h-full overflow-y-auto py-5"
      >
        <FormField
          control={form.control}
          name="boardId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Board</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("boardSectionId", "");
                    setBoardSearchQuery(""); // Clear search when selection is made
                  }}
                  value={field.value}
                  onOpenChange={(open) => {
                    if (!open) {
                      setBoardSearchQuery(""); // Clear search when dropdown closes
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={"Select a board"} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search boards..."
                        value={boardSearchQuery}
                        onChange={(e) => setBoardSearchQuery(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectGroup>
                      <SelectLabel>Boards</SelectLabel>
                      {filteredBoards.length > 0 ? (
                        filteredBoards.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          No boards found
                        </div>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="boardSectionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Board section</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedBoardId || isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedBoardId || isLoading
                          ? "Select board first"
                          : "Select a section"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sections</SelectLabel>
                      {(boardSections ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Task title" />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Task description" rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="ON_HOLD">On hold</SelectItem>
                      </SelectGroup>
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
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create task"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuickCreateForm;
