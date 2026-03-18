"use client";

import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { adminUserSchema } from "../table-data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { deleteUser } from "@/actions/admin/users/delete-user";
import { activateUser } from "@/actions/admin/users/activate-user";
import { deactivateUser } from "@/actions/admin/users/deactivate-user";
import { activateAdmin } from "@/actions/admin/users/activate-admin";
import { deactivateAdmin } from "@/actions/admin/users/deactivate-admin";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const data = adminUserSchema.parse(row.original);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  const { toast } = useToast();
  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "The URL has been copied to your clipboard.",
    });
  };

  //Action triggered when the delete button is clicked to delete the store
  const onDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteUser(data.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: "Success",
        description: "User has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong: " + error + ". Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onActivate = async () => {
    try {
      setLoading(true);
      const result = await activateUser(data.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: "Success",
        description: "User has been activated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while activating user. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onDeactivate = async () => {
    try {
      setLoading(true);
      const result = await deactivateUser(data.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: "Success",
        description: "User has been deactivated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deactivating user. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onDeactivateAdmin = async () => {
    try {
      setLoading(true);
      const result = await deactivateAdmin(data.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: "Success",
        description: "User Admin rights has been deactivated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deactivating user as a admin. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const onActivateAdmin = async () => {
    try {
      setLoading(true);
      const result = await activateAdmin(data.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: "Success",
        description: "User Admin rights has been activated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while activating uses as a admin. Please try again.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data?.id)}>
            <Copy className="mr-2 w-4 h-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onActivate()}>
            <Edit className="mr-2 w-4 h-4" />
            Activate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeactivate()}>
            <Edit className="mr-2 w-4 h-4" />
            Deactivate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onActivateAdmin()}>
            <Edit className="mr-2 w-4 h-4" />
            Activate Admin rights
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeactivateAdmin()}>
            <Edit className="mr-2 w-4 h-4" />
            Deactivate Admin rights
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 w-4 h-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
