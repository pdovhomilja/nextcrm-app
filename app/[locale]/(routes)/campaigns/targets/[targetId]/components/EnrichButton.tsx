"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

interface EnrichButtonProps {
  targetId: string;
}

export function EnrichButton({ targetId }: EnrichButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleEnrich() {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/targets/${targetId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Enrichment started — you'll be notified when done");
    } catch {
      toast.error("Failed to start enrichment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnrich}
      disabled={loading}
      title="Enrich with AI"
    >
      <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
      {loading ? "Starting…" : "Enrich with AI"}
    </Button>
  );
}
