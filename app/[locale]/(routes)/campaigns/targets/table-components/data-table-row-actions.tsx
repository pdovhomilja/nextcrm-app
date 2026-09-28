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

import { targetSchema } from "../table-data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { toast } from "sonner";
import { deleteTarget } from "@/actions/crm/targets/delete-target";
import { setTargetTriage } from "@/actions/crm/targets/set-target-triage";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateTargetForm } from "../components/UpdateTargetForm";
import { TriagePassDialog } from "../components/TriagePassDialog";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const target = targetSchema.parse(row.original);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);

  const targetLabel =
    (target?.company ||
      `${target?.first_name ? target.first_name + " " : ""}${target?.last_name}`) ??
    "target";

  const onApprove = async () => {
    const result = await setTargetTriage({ id: target.id, status: "APPROVED" });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Target approved for outreach");
    router.refresh();
  };

  const onDelete = async () => {
    setLoading(true);
    const result = await deleteTarget(target?.id);
    setLoading(false);
    setOpen(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Target has been deleted");
    router.refresh();
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
        title={
          "Update Target - " +
          (target?.first_name ? target.first_name + " " : "") +
          target?.last_name
        }
        description="Update target details"
        open={updateOpen}
        setOpen={setUpdateOpen}
      >
        <UpdateTargetForm initialData={row.original} setOpen={setUpdateOpen} />
      </RightViewModalNoTrigger>
      <TriagePassDialog
        targetId={target.id}
        targetLabel={targetLabel}
        open={passOpen}
        setOpen={setPassOpen}
        onDone={() => router.refresh()}
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
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={() => router.push(`/crm/targets/${target?.id}`)}
          >
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onApprove}>Approve</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPassOpen(true)}>
            Pass…
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
