"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EnrichFieldSelector } from "./EnrichFieldSelector";
import type { EnrichmentField } from "@/lib/enrichment/types";
import { NoApiKeyDialog } from "@/app/components/NoApiKeyDialog";

interface BulkEnrichModalProps {
  contactIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEnrichModal({ contactIds, open, onOpenChange }: BulkEnrichModalProps) {
  const [loading, setLoading] = useState(false);
  const [showNoApiKeyDialog, setShowNoApiKeyDialog] = useState(false);

  const handleStart = async (fields: EnrichmentField[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds, fields }),
      });
      if (res.ok) {
        toast.success(`Enrichment started for ${contactIds.length} contacts. Check the Enrichment Jobs page for progress.`);
        onOpenChange(false);
      } else {
        const err = await res.json();
        if (res.status === 402 || err.error === "NO_API_KEY") {
          setShowNoApiKeyDialog(true);
        } else {
          toast.error(err.error ?? "Failed to start bulk enrichment");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enrich {contactIds.length} contacts</DialogTitle>
          <DialogDescription>
            Select fields to enrich. Firecrawl will run in the background.
            Only empty fields will be filled — existing data is never overwritten.
          </DialogDescription>
        </DialogHeader>
        <EnrichFieldSelector onStart={handleStart} loading={loading} />
      </DialogContent>
    </Dialog>
    <NoApiKeyDialog open={showNoApiKeyDialog} onClose={() => setShowNoApiKeyDialog(false)} />
  );
}
