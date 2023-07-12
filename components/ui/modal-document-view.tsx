"use client";

import { Dialog, DialogContent } from "./dialog-document-view";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function ModalDocumentView({
  isOpen,
  onClose,
  children,
}: ModalProps) {
  const onChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className="w-full h-2/3">
        <div className="h-full py-10">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
