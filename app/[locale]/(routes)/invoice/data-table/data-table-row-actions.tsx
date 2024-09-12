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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { taskSchema } from "../data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import axios from "axios";
import InvoiceViewModal from "@/components/modals/invoice-view-modal";

import RossumCockpit from "../components/RossumCockpit";
import Link from "next/link";
import LoadingModal from "@/components/modals/loading-modal";
import { useAppStore } from "@/store/store";

import { Edit } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openRossumView, setOpenRossumView] = useState(false);
  const [openTestSheet, setOpenTestSheet] = useState(false);

  //zustand
  const { setIsOpen, setNotionUrl } = useAppStore();

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
      <Sheet open={openView} onOpenChange={setOpenView}>
        <SheetContent className="min-w-[90vh]">
          <SheetHeader className="py-4">
            <SheetTitle>{"Preview Invoice" + " - " + invoice?.id}</SheetTitle>
          </SheetHeader>
          <div className="h-[90vh] pb-4">
            <embed
              style={{
                width: "100%",
                height: "100%",
              }}
              type="application/pdf"
              src={invoice.invoice_file_url}
            />
          </div>
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
      <Sheet open={openRossumView} onOpenChange={setOpenRossumView}>
        <SheetContent className="min-w-[90vh] max-w-full">
          <SheetHeader>
            <SheetTitle>{"Update Invoice" + " - " + invoice?.id}</SheetTitle>
            <SheetDescription>
              Update invoice metadata with Rossum cockpit
            </SheetDescription>
          </SheetHeader>
          <RossumCockpit invoiceData={row.original} />
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
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
        <DropdownMenuContent align="end" className="w-[260px] ">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Actions</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setOpenView(true)}>
                Preview invoice
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push(`/invoice/detail/${invoice.id}`)}
              >
                Invoice detail
              </DropdownMenuItem>

              <Link href={invoice.invoice_file_url} target={"_blank"}>
                <DropdownMenuItem>
                  Preview invoice in new window
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(true);
                  setNotionUrl(
                    `${process.env.NEXT_PUBLIC_APP_URL}/invoice/detail/${invoice.id}`
                  );
                }}
              >
                <Edit className="mr-2 w-4 h-4" />
                Create task from Invoice
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Rossum</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setOpenRossumView(true)}>
                Edit metadata with Rossum cockpit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExtract}>
                Extract data from invoice
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Exports for ERPs</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={onMoneyS3export}>
                Money S3 XML
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Download data for ERPs
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    invoice.rossum_annotation_json_url
                      ? invoice.rossum_annotation_json_url
                      : "/invoice"
                  )
                }
              >
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    invoice.money_s3_url ? invoice.money_s3_url : "/invoice"
                  )
                }
              >
                MoneyS3 XML
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuLabel></DropdownMenuLabel>

          <DropdownMenuSeparator />

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
