"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { EnrichContactDrawer } from "./EnrichContactDrawer";

interface EnrichButtonProps {
  contactId: string;
  contactEmail: string | null;
  contactCurrentData: {
    position?: string | null;
    website?: string | null;
    social_linkedin?: string | null;
    social_twitter?: string | null;
    social_facebook?: string | null;
    social_instagram?: string | null;
    description?: string | null;
    office_phone?: string | null;
    mobile_phone?: string | null;
  };
}

export function EnrichButton({ contactId, contactEmail, contactCurrentData }: EnrichButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!contactEmail}
        title={!contactEmail ? "Add an email to enable enrichment" : "Enrich with AI"}
      >
        <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
        Enrich with AI
      </Button>
      <EnrichContactDrawer
        contactId={contactId}
        contactEmail={contactEmail}
        contactCurrentData={contactCurrentData}
        open={open}
        onOpenChange={setOpen}
        onApplied={() => window.location.reload()}
      />
    </>
  );
}
