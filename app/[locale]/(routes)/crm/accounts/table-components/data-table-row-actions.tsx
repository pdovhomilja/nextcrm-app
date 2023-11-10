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

import { accountSchema } from "../table-data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateAccountForm } from "../components/UpdateAccountForm";
import { Eye, EyeOff } from "lucide-react";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const account = accountSchema.parse(row.original);

  const [open, setOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`/api/crm/account/${account.id}`);
      toast({
        title: "Success",
        description: "Opportunity has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting opportunity. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  const onWatch = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/crm/account/${account.id}/watch`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, Account not watched. Please try again.",
      });
      console.log(error);
    } finally {
      toast({
        title: "Success",
        description: `You are now Account: ${account.name}, watcher`,
      });
      setLoading(false);
    }
  };

  const onUnWatch = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/crm/account/${account.id}/unwatch`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, Account not watched. Please try again.",
      });
      console.log(error);
    } finally {
      toast({
        title: "Success",
        description: `You are no longer Project: ${account.name}, watcher`,
      });
      setLoading(false);
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
      <RightViewModalNoTrigger
        title={"Update Account" + " - " + account?.name}
        description="Update account details"
        open={updateOpen}
        setOpen={setUpdateOpen}
      >
        <UpdateAccountForm initialData={row.original} open={setUpdateOpen} />
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
          <DropdownMenuItem
            onClick={() => router.push(`/crm/accounts/${account?.id}`)}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onWatch}>
            <Eye className="mr-2 w-4 h-4" />
            Watch Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUnWatch}>
            <EyeOff className="mr-2 w-4 h-4" />
            Stop watching Account
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
