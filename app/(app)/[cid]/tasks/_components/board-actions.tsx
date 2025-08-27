"use client";

import { Button } from "@/components/ui/button";
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from 'zod/v3';
import { zodResolver } from "@hookform/resolvers/zod";
import { editBoard } from "@/actions/tasks/edit-board";

const BoardActions = ({
  boardId,
  boardName,
  boardDescription,
}: {
  boardId: string;
  boardName: string;
  boardDescription?: string | null;
}) => {
  const router = useRouter();
  const [onDelete, setOnDelete] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(0),
  });

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: boardName ?? "",
      description: boardDescription ?? "",
    },
  });

  useEffect(() => {
    if (isEditOpen) {
      form.reset({
        name: boardName ?? "",
        description: boardDescription ?? "",
      });
    }
  }, [isEditOpen, boardName, boardDescription, form]);

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

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await editBoard(boardId, {
        name: data.name,
        description: data.description ?? "",
      });
      if ("error" in (res as object)) {
        const err = res as { error: string };
        toast.error(err.error);
        return;
      }
      toast.success("Board updated");
      setIsEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update board");
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" side="bottom">
          <DropdownMenuItem onClick={() => setOnDelete(true)}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete Board
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Edit Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Board</SheetTitle>
            <SheetDescription>
              Update the board name and description.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Board name" />
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
                        <Input {...field} placeholder="Board description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

export default BoardActions;
