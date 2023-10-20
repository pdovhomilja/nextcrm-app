"use client";

import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Row } from "@tanstack/react-table";
import { Copy, Edit, LinkIcon, MoreHorizontal, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAppStore } from "@/store/store";
import { useToast } from "@/components/ui/use-toast";
import AlertModal from "@/components/modals/alert-modal";

import { secondBrainSchema } from "../table-data/schema";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const data = secondBrainSchema.parse(row.original);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  //zustand
  const { setIsOpen, setNotionUrl } = useAppStore();

  const { toast } = useToast();
  const router = useRouter();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "The URL has been copied to your clipboard.",
    });
  };

  //Action triggered when the delete button is clicked to delete the store
  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`/api/secondBrain/${data.id}`);
      //Place for toast
      toast({
        title: "Success",
        description: "The Notion has been deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting the product. Please try again.",
      });
    } finally {
      router.refresh();
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
          <DropdownMenuItem onClick={() => onCopy(data?.url)}>
            <Copy className="mr-2 w-4 h-4" />
            Copy URL
          </DropdownMenuItem>
          <Link href={data.url} target={"_blank"}>
            <DropdownMenuItem>
              <LinkIcon className="mr-2 w-4 h-4" />
              Open in new tab
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
              setNotionUrl(data?.url);
            }}
          >
            <Edit className="mr-2 w-4 h-4" />
            Create task from Notion
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
