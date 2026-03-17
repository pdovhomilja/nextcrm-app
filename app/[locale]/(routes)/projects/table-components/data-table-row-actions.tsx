"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { taskSchema } from "../data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import axios from "axios";
import {
  Eye,
  EyeIcon,
  EyeOff,
  Glasses,
  Magnet,
  Pencil,
  Trash,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";

import UpdateProjectForm from "../forms/UpdateProject";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const project = taskSchema.parse(row.original);
  const t = useTranslations("ProjectsPage");

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`/api/projects/${project.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("dataTable.deleteError"),
      });
      console.log(error);
    } finally {
      toast({
        title: t("dataTable.delete"),
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
        title: t("dataTable.watchError"),
      });
      console.log(error);
    } finally {
      toast({
        title: t("dataTable.watchProject"),
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
        title: t("dataTable.watchError"),
      });
      console.log(error);
    } finally {
      toast({
        title: t("dataTable.stopWatching"),
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
      <Sheet open={editOpen} onOpenChange={() => setEditOpen(false)}>
        <SheetContent className="max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("dataTable.editProject")}</SheetTitle>
            <SheetDescription>
              {t("dataTable.editProjectDesc")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UpdateProjectForm initialData={project} openEdit={setEditOpen} />
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
            <span className="sr-only">{t("dataTable.openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuItem
            onClick={() => router.push(`/projects/boards/${project.id}`)}
          >
            <Glasses className="mr-2 w-4 h-4" />
            {t("dataTable.viewDetail")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 w-4 h-4" />
            {t("dataTable.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onWatch}>
            <Eye className="mr-2 w-4 h-4" />
            {t("dataTable.watchProject")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUnWatch}>
            <EyeOff className="mr-2 w-4 h-4" />
            {t("dataTable.stopWatching")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 w-4 h-4" />
            {t("dataTable.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
