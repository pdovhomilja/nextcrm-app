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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {} from "../data/data";
import { taskSchema } from "../data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import axios from "axios";
import InvoiceViewModal from "@/components/modals/invoice-view-modal";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import RossumCockpit from "../../components/RossumCockpit";
import Link from "next/link";
import LoadingModal from "@/components/modals/loading-modal";
import { set } from "date-fns";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openRossumView, setOpenRossumView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const invoice = taskSchema.parse(row.original);

  //Action triggered when the delete button is clicked to delete the store
  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/invoice/${invoice.id}`);
      router.refresh();
      toast({
        title: "Success",
        description: "Document has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting document. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onExtract = async () => {
    setLoading(true);
    setLoadingOpen(true);
    try {
      await axios.get(
        `/api/invoice/rossum/get-annotation/${invoice.rossum_annotation_id}`
      );
      toast({
        title: "Success",
        description: `Data from invoice with annotation ID ${invoice.rossum_annotation_id} has been extracted`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while extracting data. Please try again.",
      });
    } finally {
      setLoadingOpen(false);
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <>
      <InvoiceViewModal
        isOpen={openView}
        onClose={() => setOpenView(false)}
        loading={loading}
        document={invoice}
      />
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />

      <LoadingModal
        title="Extracting data from Rossum"
        description="Extracting data from Invoice via Rossum Ai tool. Extracted data will be saved in the database. Please wait..."
        isOpen={loadingOpen}
      />

      <RightViewModalNoTrigger
        title={"Update Invoice" + " - " + invoice?.id}
        description="Update invoice metadata with Rossum cockpit"
        open={openRossumView}
        setOpen={setOpenRossumView}
      >
        <RossumCockpit invoiceData={row.original} />
      </RightViewModalNoTrigger>
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
          <DropdownMenuItem onClick={() => setOpenView(true)}>
            View Document
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Rossum</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenRossumView(true)}>
            Edit metadata with Rossum cockpit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExtract}>
            Extract data from invoice
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link
              href={
                invoice.rossum_annotation_json_url
                  ? invoice.rossum_annotation_json_url
                  : "/invoice"
              }
            >
              Download json from Rossum
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
