"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentRow } from "../data/schema";
import { useRouter } from "next/navigation";
import { DocumentDetailPanel } from "./document-detail-panel";
import DocumentViewModal from "@/components/modals/document-view-modal";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { toast } from "sonner";
import { deleteDocument } from "@/actions/documents/delete-document";

interface DataTableRowActionsProps {
  row: Row<DocumentRow>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const document = row.original;

  const onDelete = async () => {
    try {
      setLoading(true);
      await deleteDocument(document.id);
      router.refresh();
      toast.success("Document has been deleted");
    } catch {
      toast.error("Something went wrong while deleting document.");
    } finally {
      setLoading(false);
      setOpenDelete(false);
    }
  };

  return (
    <>
      {openView && (
        <DocumentViewModal
          isOpen={openView}
          onClose={() => setOpenView(false)}
          loading={loading}
          document={document}
        />
      )}
      {openDelete && (
        <AlertModal
          isOpen={openDelete}
          onClose={() => setOpenDelete(false)}
          onConfirm={onDelete}
          loading={loading}
        />
      )}
      <DocumentDetailPanel
        document={document}
        open={openDetail}
        onClose={() => setOpenDetail(false)}
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
          <DropdownMenuItem onClick={() => setOpenDetail(true)}>
            Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenView(true)}>
            View File
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenDelete(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
