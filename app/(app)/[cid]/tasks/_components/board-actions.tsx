"use client";

import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { deleteBoard } from "@/actions/tasks/delete-board";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { useRouter } from "next/navigation";

const BoardActions = ({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) => {
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteBoard(boardId);
      setOnDelete(false);
      router.refresh();
      toast.success("Board deleted successfully");
    } catch {
      toast.error("Failed to delete board");
    }
  };

  if (onDelete) {
    return (
      <Dialog open={onDelete} onOpenChange={setOnDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board - {boardName}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this board?
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
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="bottom">
        <DropdownMenuItem onClick={() => setOnDelete(true)}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Delete Board
        </DropdownMenuItem>
        <DropdownMenuItem>
          <PencilIcon className="mr-2 h-4 w-4" />
          Edit Board
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BoardActions;
