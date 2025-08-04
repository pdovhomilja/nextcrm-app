"use client";

import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
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

const TaskActions = ({
  taskId,
  taskName,
}: {
  taskId: string;
  taskName: string;
}) => {
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTask(taskId);
      setOnDelete(false);
      router.refresh();
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  if (onDelete) {
    return (
      <Dialog open={onDelete} onOpenChange={setOnDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task - {taskName}</DialogTitle>
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
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreHorizontalIcon size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="bottom">
        <DropdownMenuItem onClick={() => setOnDelete(true)}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Delete Task
        </DropdownMenuItem>
        <DropdownMenuItem>
          <PencilIcon className="mr-2 h-4 w-4" />
          Edit Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TaskActions;
