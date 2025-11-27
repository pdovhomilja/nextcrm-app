// in app/(app)/[cid]/tasks/_components/ai-board-wizard-dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAiBoardWizard } from "./use-ai-board-wizard";
import { InitialStepForm } from "./initial-step-form";
import { RefinementChatInterface } from "./refinement-chat-interface";
import { FinalBriefView } from "./final-brief-view";

interface AiBoardWizardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiBoardWizardDialog({
  isOpen,
  onOpenChange,
}: AiBoardWizardDialogProps) {
  const wizard = useAiBoardWizard({ onOpenChange });

  // Handle dialog open/close and reset wizard state when closing
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      wizard.resetWizard();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>AI Board Wizard</DialogTitle>
          <DialogDescription>
            Let&apos;s create a detailed project plan from your idea.
          </DialogDescription>
        </DialogHeader>

        {wizard.step === "initial" && <InitialStepForm wizard={wizard} />}
        {wizard.step === "refining" && (
          <RefinementChatInterface wizard={wizard} />
        )}
        {wizard.step === "final_brief" && <FinalBriefView wizard={wizard} />}
      </DialogContent>
    </Dialog>
  );
}
