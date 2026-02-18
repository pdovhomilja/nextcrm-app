"use client";

import SuspenseLoading from "../loadings/suspense";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type LoadingModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
};

const LoadingModal = ({ isOpen, title, description }: LoadingModalProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
          <SuspenseLoading />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingModal;
