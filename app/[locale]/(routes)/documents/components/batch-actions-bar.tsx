"use client";

import { useState } from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AlertModal from "@/components/modals/alert-modal";
import { bulkDeleteDocuments } from "@/actions/documents/bulk-delete-documents";
import { bulkChangeType } from "@/actions/documents/bulk-change-type";
import { bulkLinkToAccount } from "@/actions/documents/bulk-link-to-account";
import { DocumentSystemType } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DocumentRow } from "../data/schema";

interface BatchActionsBarProps {
  table: Table<DocumentRow>;
  accounts: { id: string; name: string }[];
}

export function BatchActionsBar({ table, accounts }: BatchActionsBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);
  const count = selectedIds.length;

  if (count === 0) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      await bulkDeleteDocuments(selectedIds);
      table.toggleAllRowsSelected(false);
      toast.success(`${count} document(s) deleted`);
      router.refresh();
    } catch {
      toast.error("Failed to delete documents");
    } finally {
      setLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleChangeType = async (type: string) => {
    try {
      await bulkChangeType(selectedIds, type as DocumentSystemType);
      toast.success(`Type updated for ${count} document(s)`);
      router.refresh();
    } catch {
      toast.error("Failed to update type");
    }
  };

  const handleLinkAccount = async (accountId: string) => {
    try {
      await bulkLinkToAccount(selectedIds, accountId);
      toast.success(`${count} document(s) linked to account`);
      router.refresh();
    } catch {
      toast.error("Failed to link documents");
    }
  };

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
      <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm">
        <span className="font-medium">{count} selected</span>

        <Select onValueChange={handleLinkAccount}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Link to Account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={handleChangeType}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Change Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RECEIPT">Receipt</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>
    </>
  );
}
