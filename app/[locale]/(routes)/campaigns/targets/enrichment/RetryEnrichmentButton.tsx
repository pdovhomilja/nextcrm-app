"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface RetryEnrichmentButtonProps {
  targetId: string;
  fields: string[];
}

export function RetryEnrichmentButton({ targetId, fields }: RetryEnrichmentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/targets/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetIds: [targetId],
          fields: fields.map((name) => ({
            name,
            displayName: name,
            description: `Find ${name}`,
            type: "string",
            required: false,
          })),
        }),
      });
      if (res.ok) {
        toast.success("Retry queued. Refresh to see updated status.");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to retry");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleRetry} disabled={loading}>
      <RotateCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
      Retry
    </Button>
  );
}
