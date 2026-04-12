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
import { toast } from "sonner";
import { disconnectDocumentFromCrmTask } from "@/actions/crm/tasks/assign-document";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActionsTasks<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const document = taskSchema.parse(row.original);

  const router = useRouter();
  const params = useParams();

  //console.log(params, "params");


  const onDisconnect = async () => {
    setLoading(true);
    try {
      const result = await disconnectDocumentFromCrmTask({
        documentId: document.id,
        taskId: params?.taskId as string,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Document was disconnected from task");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong, while disconnecting document from task");
    } finally {
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
        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuItem onClick={onDisconnect}>
            Disconnect from task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
