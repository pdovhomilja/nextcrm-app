// in app/(app)/[cid]/tasks/_components/ai-board-wizard-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiBoardWizardDialog } from "./ai-board-wizard-dialog";

export function AiBoardWizardButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Sparkles className="mr-2 h-4 w-4" />
        AI Board Wizard
      </Button>
      <AiBoardWizardDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
