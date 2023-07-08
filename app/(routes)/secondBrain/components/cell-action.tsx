"use client";
import { useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { ProductColumn } from "./Columns";
import AlertModal from "@/components/modals/alert-modal";

interface CellActionProps {
  data: ProductColumn;
}

export const CellAction = ({ data }: CellActionProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const params = useParams();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Product ID copied to the clipboard");
  };

  //Action triggered when the delete button is clicked to delete the store
  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/products/${data.id}`);
      router.refresh();
      toast.success("Products deleted");
    } catch (error) {
      toast.error(
        "Something went wrong while deleting the product. Please try again."
      );
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
          <DropdownMenuItem onClick={() => onCopy(data.id)}>
            <Copy className="mr-2 w-4 h-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/products/${data.id}`)}>
            <Edit className="mr-2 w-4 h-4" />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 w-4 h-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
