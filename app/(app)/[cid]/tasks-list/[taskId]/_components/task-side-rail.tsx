"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editTask } from "@/actions/tasks/edit-task";
import { toast } from "sonner";
import { Task } from "../../../tasks/_types";

interface TaskSideRailProps {
  task: Task;
  users: { id: string; name: string | null }[];
}

export default function TaskSideRail({ task, users }: TaskSideRailProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(
    task.assignedTo.id ?? undefined
  );

  async function onChangeAssignee(id: string) {
    setIsSaving(true);
    try {
      await editTask(task.id, { assignedToId: id });
      setAssigneeId(id);
      toast.success("Assignee updated");
    } catch {
      toast.error("Failed to update assignee");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={onChangeAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium">{task.status}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Priority: </span>
              <span className="font-medium">{task.priority}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Board: </span>
              <span className="font-medium">
                {task.boardSection?.board?.name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Section: </span>
              <span className="font-medium">{task.boardSection?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span className="font-medium">
                {new Date(task.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated: </span>
              <span className="font-medium">
                {new Date(task.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {isSaving && (
            <div className="text-xs text-muted-foreground">Saving…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
