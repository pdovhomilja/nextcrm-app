"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { EnrichTargetDrawer } from "./EnrichTargetDrawer";

interface EnrichButtonProps {
  targetId: string;
  targetEmail: string | null;
  targetCompany: string | null;
  targetCurrentData: {
    position?: string | null;
    company?: string | null;
    company_website?: string | null;
    personal_website?: string | null;
    mobile_phone?: string | null;
    office_phone?: string | null;
    social_linkedin?: string | null;
    social_x?: string | null;
    social_instagram?: string | null;
    social_facebook?: string | null;
  };
}

export function EnrichButton({ targetId, targetEmail, targetCompany, targetCurrentData }: EnrichButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Enrich with AI"
      >
        <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
        Enrich with AI
      </Button>
      <EnrichTargetDrawer
        targetId={targetId}
        targetEmail={targetEmail}
        targetCompany={targetCompany}
        targetCurrentData={targetCurrentData}
        open={open}
        onOpenChange={setOpen}
        onApplied={() => window.location.reload()}
      />
    </>
  );
}
