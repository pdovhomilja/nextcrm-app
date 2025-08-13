"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { editTask } from "@/actions/tasks/edit-task";
import { toast } from "sonner";
import { Task } from "../../../tasks/_types";

interface TaskDescriptionProps {
  task: Task;
}

export default function TaskDescription({ task }: TaskDescriptionProps) {
  const [value, setValue] = useState(task.description ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function onSave() {
    setIsSaving(true);
    try {
      await editTask(task.id, { description: value ?? "" });
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a detailed description..."
        rows={6}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setValue(task.description ?? "")}
        >
          Reset
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
