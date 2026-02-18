"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PencilIcon } from "lucide-react";
import React from "react";

type Props = {
  open2: boolean;
  setOpen2: (open: boolean) => void;
};

const PasswordResetDialog = ({ open2, setOpen2 }: Props) => {
  return (
    <Dialog open={open2} onOpenChange={setOpen2}>
      <DialogTrigger asChild>
        <button className="rounded p-2 hover:bg-accent">
          <PencilIcon className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
          <DialogDescription>
            Make changes to the contact information here.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* TODO: Add password reset form here */}
          <p className="text-sm text-muted-foreground">
            Password reset form to be implemented.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetDialog;
