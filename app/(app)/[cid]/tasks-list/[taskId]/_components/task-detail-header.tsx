"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { editTask, type EditTaskInput } from "@/actions/tasks/edit-task";
import { toast } from "sonner";
import { CheckIcon, MoreHorizontalIcon } from "lucide-react";
import { Task } from "../../../tasks/_types";
import { useRouter } from "next/navigation";
import { markDone } from "@/actions/tasks/mark-done";

interface TaskDetailHeaderProps {
  task: Task;
}

export default function TaskDetailHeader({ task }: TaskDetailHeaderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isDueOpen, setIsDueOpen] = useState(false);
  const [dueMonth, setDueMonth] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : new Date(),
  );

  async function saveInline(changes: EditTaskInput) {
    setIsSaving(true);
    try {
      await editTask(task.id, changes);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      router.refresh();
      setIsSaving(false);
    }
  }

  async function markAsDone() {
    setIsSaving(true);
    try {
      await markDone(task.id);
      toast.success("Task marked as done");
      router.refresh();
    } catch {
      toast.error("Failed to mark task as done");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title && title !== task.title && saveInline({ title })}
          className="text-xl font-semibold"
        />
        <Badge variant="secondary">{task.status}</Badge>
        <Badge>{task.priority}</Badge>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDueOpen((v) => !v)}
            className="min-w-40 justify-between"
          >
            {task.dueDate
              ? format(new Date(task.dueDate), "PPP")
              : "Pick a due date"}
          </Button>
          {isDueOpen && (
            <div className="absolute z-50 mt-2 rounded-md border bg-popover p-2 shadow-md">
              <div className="flex items-center justify-between px-2 pb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setDueMonth(today);
                    saveInline({ dueDate: today });
                    setIsDueOpen(false);
                  }}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    saveInline({ dueDate: null });
                    setIsDueOpen(false);
                  }}
                >
                  Clear
                </Button>
              </div>
              <Calendar
                mode="single"
                month={dueMonth}
                onMonthChange={setDueMonth}
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={(d?: Date) => {
                  if (d) {
                    const startOfToday = new Date();
                    startOfToday.setHours(0, 0, 0, 0);
                    if (d < startOfToday) return;
                  }
                  saveInline({ dueDate: d ?? null });
                  setIsDueOpen(false);
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
        <DropdownMenu>
          <DropdownMenuTrigger>
            <MoreHorizontalIcon size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side="bottom">
            <DropdownMenuItem onClick={markAsDone}>
              <CheckIcon className="mr-2 h-4 w-4" />
              Mark as Done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isSaving && (
        <span className="text-xs text-muted-foreground">Saving…</span>
      )}
    </div>
  );
}
