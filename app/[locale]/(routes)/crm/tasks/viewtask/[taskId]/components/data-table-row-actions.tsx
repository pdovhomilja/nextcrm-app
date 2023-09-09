"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useParams } from "next/navigation";

import { labels } from "../data/data";
import { taskSchema } from "../data/schema";
import { useRouter } from "next/navigation";
import DocumentViewModal from "@/components/modals/document-view-modal";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const document = taskSchema.parse(row.original);

  const router = useRouter();
  const params = useParams();

  //console.log(params, "params");

  const { toast } = useToast();

  const onAssign = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/projects/tasks/${document.id}/assign`, {
        taskId: params?.taskId!,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong, while assigning document to task",
      });
    } finally {
      toast({
        title: "Success",
        description: "Document was assigned to task",
      });
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <>
      <DocumentViewModal
        isOpen={open}
        onClose={() => setOpen(false)}
        loading={loading}
        document={document}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={onAssign}>
            Connect to task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
