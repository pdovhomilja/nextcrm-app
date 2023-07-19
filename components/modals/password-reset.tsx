"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CrossIcon, PencilIcon } from "lucide-react";
import React, { useState } from "react";

type Props = {
  open2: boolean;
  setOpen2: (open: boolean) => void;
};

const PasswordResetDialog = ({ open2, setOpen2 }: Props) => {
  return (
    <div>
      <Dialog.Root open={open2} onOpenChange={setOpen2}>
        <Dialog.Trigger className="rounded p-2">
          <PencilIcon />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=closed]:animate-[dialog-overlay-hide_200ms] data-[state=open]:animate-[dialog-overlay-show_200ms]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md p-8 text-gray-900 shadow data-[state=closed]:animate-[dialog-content-hide_200ms] data-[state=open]:animate-[dialog-content-show_200ms]">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl">Edit contact</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-500">
                <CrossIcon onClick={() => setOpen2(false)} />
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default PasswordResetDialog;
