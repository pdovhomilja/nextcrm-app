"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Icons } from "../ui/icons";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
}

const AlertModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = "Are you sure?",
  description = "This action cannot be undone.",
}: AlertModalProps) => {
  const onChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            disabled={loading}
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={loading} variant="destructive" onClick={onConfirm}>
            {loading ? <Icons.spinner className="animate-spin" /> : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlertModal;
