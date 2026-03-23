"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NoApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NoApiKeyDialog({ open, onClose }: NoApiKeyDialogProps) {
  const router = useRouter();

  const handleGoToSettings = () => {
    onClose();
    router.push("/profile?tab=llms");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>API Keys Required</DialogTitle>
          <DialogDescription>
            Enrichment requires API keys. Configure them in your profile settings, or ask your admin to set a system-wide key.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleGoToSettings}>
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
