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

import { labels } from "../data/data";
import { taskSchema } from "../data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import axios from "axios";
import { Eye, EyeIcon, EyeOff, Glasses, Magnet, Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const project = taskSchema.parse(row.original);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`/api/projects/${project.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, project not deleted. Please try again.",
      });
      console.log(error);
    } finally {
      toast({
        title: "Success",
        description: `Project: ${project.title}, deleted successfully`,
      });
      router.refresh();
      setOpen(false);
      setLoading(false);
    }
  };

  const onWatch = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/projects/${project.id}/watch`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, project not watched. Please try again.",
      });
      console.log(error);
    } finally {
      toast({
        title: "Success",
        description: `Project: ${project.title}, watched successfully`,
      });
      setLoading(false);
    }
  };

  const onUnWatch = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/projects/${project.id}/unwatch`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error, project not watched. Please try again.",
      });
      console.log(error);
    } finally {
      toast({
        title: "Success",
        description: `Project: ${project.title}, You stop watching this project successfully`,
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
            onClick={() => router.push(`/projects/boards/${project.id}`)}
          >
            <Glasses className="mr-2 w-4 h-4" />
            View project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onWatch}>
            <Eye className="mr-2 w-4 h-4" />
            Watch project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUnWatch}>
            <EyeOff className="mr-2 w-4 h-4" />
            Stop watching project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 w-4 h-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
