"use client";

import { useEffect, useState } from "react";

import SuspenseLoading from "../loadings/suspense";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { type } from "os";

type LoadingModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
};

const LoadingModal = ({ isOpen, title, description }: LoadingModalProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="py-5">{description}</DialogDescription>
        </DialogHeader>
        <SuspenseLoading />
      </DialogContent>
    </Dialog>
  );
};

export default LoadingModal;
