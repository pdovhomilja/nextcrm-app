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

const TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",           description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",       description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",        description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The target's Facebook profile URL", type: "string", required: false },
];

interface BulkEnrichTargetsModalProps {
  targetIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEnrichTargetsModal({ targetIds, open, onOpenChange }: BulkEnrichTargetsModalProps) {
  const [loading, setLoading] = useState(false);

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
        toast.error(err.error ?? "Failed to start bulk enrichment");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
          presetFields={TARGET_PRESET_FIELDS}
          defaultSelected={["position", "company", "social_linkedin", "company_website"]}
        />
      </DialogContent>
    </Dialog>
  );
}
