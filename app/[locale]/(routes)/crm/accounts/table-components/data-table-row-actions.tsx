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
import { toast } from "sonner";
import { UpdateAccountForm } from "../components/UpdateAccountForm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Eye, EyeOff } from "lucide-react";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { watchAccount } from "@/actions/crm/accounts/watch-account";
import { unwatchAccount } from "@/actions/crm/accounts/unwatch-account";

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


  const onDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteAccount(account.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Account has been deleted");
      }
    } catch (error) {
      toast.error("Something went wrong while deleting account. Please try again.");
    } finally {
      setLoading(false);
      setOpen(false);
      router.refresh();
    }
  };

  const onWatch = async () => {
    setLoading(true);
    try {
      const result = await watchAccount(account.id);
      if (result.error) {
        toast.error("Error");
      } else {
        toast.success(`You are now Account: ${account.name}, watcher`);
      }
    } catch (error) {
      toast.error("Error");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const onUnWatch = async () => {
    setLoading(true);
    try {
      const result = await unwatchAccount(account.id);
      if (result.error) {
        toast.error("Error");
      } else {
        toast.success(`You are no longer Account: ${account.name}, watcher`);
      }
    } catch (error) {
      toast.error("Error");
      console.log(error);
    } finally {
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
      <Sheet open={updateOpen} onOpenChange={setUpdateOpen}>
        <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Account - {account?.name}</SheetTitle>
            <SheetDescription>Update account details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UpdateAccountForm initialData={row.original} open={setUpdateOpen} />
          </div>
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
