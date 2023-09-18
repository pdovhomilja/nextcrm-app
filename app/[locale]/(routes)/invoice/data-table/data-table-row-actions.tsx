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
import RossumCockpit from "../components/RossumCockpit";
import Link from "next/link";
import LoadingModal from "@/components/modals/loading-modal";
import { useAppStore } from "@/store/store";
import { Edit } from "lucide-react";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openRossumView, setOpenRossumView] = useState(false);

  //zustand
  const { setIsOpen } = useAppStore();

  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingMoneyS3export, setLoadingMoneyS3export] = useState(false);
  const [loadingXMLEmail, setLoadingXMLEmail] = useState(false);

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
    } catch (error: any) {
      //console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response.data.error,
      });
    } finally {
      setLoadingOpen(false);
      setLoading(false);
      router.refresh();
    }
  };

  const onMoneyS3export = async () => {
    setLoading(true);
    setLoadingMoneyS3export(true);
    try {
      await axios.get(`/api/invoice/money-s3-xml/${invoice.id}`);
      toast({
        title: "Success",
        description: `Create XML fro Money S3 import and store XML in S3 bucket`,
      });
    } catch (error: any) {
      //console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response.data.error,
      });
    } finally {
      setLoadingMoneyS3export(false);
      setLoading(false);
      router.refresh();
    }
  };

  const onSendToMail = async () => {
    setLoading(true);
    setLoadingXMLEmail(true);
    try {
      await axios.get(`/api/invoice/send-by-email/${invoice.id}`);
      toast({
        title: "Success",
        description: `XML for ERP import sent to accountant email`,
      });
    } catch (error: any) {
      //console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response.data.error,
      });
    } finally {
      setLoadingXMLEmail(false);
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
      <LoadingModal
        title="Exporting XML for Money S3"
        description="Exporting XML for Money S3. Please wait..."
        isOpen={loadingMoneyS3export}
      />
      <LoadingModal
        title="Sending XML for ERP import by email"
        description="Extracted data from inovice will be sent to accountant email. Please wait..."
        isOpen={loadingXMLEmail}
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
            Preview Document
          </DropdownMenuItem>
          <Link href={`/invoice/detail/${invoice.id}`}>
            <DropdownMenuItem>Invoice detail</DropdownMenuItem>
          </Link>
          <Link href={invoice.invoice_file_url} target={"_blank"}>
            <DropdownMenuItem>Preview invoice in new window</DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
            }}
          >
            <Edit className="mr-2 w-4 h-4" />
            Create task from Notion
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Rossum</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setOpenRossumView(true)}>
            Edit metadata with Rossum cockpit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExtract}>
            Extract data from invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Export for ERPs</DropdownMenuLabel>

          <DropdownMenuItem onClick={onMoneyS3export}>
            XML for Money S3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Download data for ERPs</DropdownMenuLabel>
          <Link
            href={
              invoice.rossum_annotation_json_url
                ? invoice.rossum_annotation_json_url
                : "/invoice"
            }
            target="_blank"
          >
            <DropdownMenuItem>JSON</DropdownMenuItem>
          </Link>
          <Link
            href={invoice.money_s3_url ? invoice.money_s3_url : "/invoice"}
            target="_blank"
          >
            <DropdownMenuItem>MoneyS3 XML</DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Send XML by mail</DropdownMenuLabel>
          <DropdownMenuItem onClick={onSendToMail}>
            Send XML to accountant email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
          {process.env.NODE_ENV === "development" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Development mode only</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <DropdownMenuItem>Rossum annotation JSON</DropdownMenuItem>
                  <DropdownMenuSubContent>
                    <Link
                      href={`/invoice/annotation/${invoice.rossum_annotation_id}`}
                      target="_blank"
                    >
                      <DropdownMenuItem>Show annotation</DropdownMenuItem>
                    </Link>
                  </DropdownMenuSubContent>
                </DropdownMenuSubTrigger>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
