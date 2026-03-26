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
import { ALL_TARGET_PRESET_FIELDS } from "@/lib/enrichment/presets/target-fields";
import { NoApiKeyDialog } from "@/app/components/NoApiKeyDialog";


interface BulkEnrichTargetsModalProps {
  targetIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEnrichTargetsModal({ targetIds, open, onOpenChange }: BulkEnrichTargetsModalProps) {
  const [loading, setLoading] = useState(false);
  const [showNoApiKeyDialog, setShowNoApiKeyDialog] = useState(false);

  const handleStart = async (fields: EnrichmentField[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/targets/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetIds, fields }),
      });
      if (res.ok) {
        toast.success(`Enrichment started for ${targetIds.length} targets. Check the Enrichment Jobs page for progress.`);
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enrich {targetIds.length} targets</DialogTitle>
          <DialogDescription>
            Select fields to enrich. Firecrawl will run in the background.
            Only empty fields will be filled — existing data is never overwritten.
          </DialogDescription>
        </DialogHeader>
        <EnrichFieldSelector
          onStart={handleStart}
          loading={loading}
          presetFields={ALL_TARGET_PRESET_FIELDS}
          defaultSelected={["position", "company", "social_linkedin", "company_website"]}
        />
      </DialogContent>
    </Dialog>
    <NoApiKeyDialog open={showNoApiKeyDialog} onClose={() => setShowNoApiKeyDialog(false)} />
    </>
  );
}
