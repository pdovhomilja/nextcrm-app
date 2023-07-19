"use client";

import { ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross1Icon } from "@radix-ui/react-icons";

type Props = {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
};

const RightViewModal = ({ label, title, description, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>{label}</Button>
      </Dialog.Trigger>

      <Dialog.Portal className="">
        <Dialog.Overlay className="data-[state=open]:animate-[dialog-overlay-show_1000ms] data-[state=closed]:animate-[dialog-overlay-hide_1000ms] fixed inset-0 bg-black/50" />
        <Dialog.Content className="data-[state=open]:animate-[dialog-content-show_1000ms] data-[state=closed]:animate-[dialog-content-hide_1000ms] fixed top-0 right-0 rounded-md border  w-1/2 h-full bg-white dark:bg-slate-900 shadow-md overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between w-full">
              <Dialog.Title className="font-semibold p-3 w-full">
                {title}
              </Dialog.Title>
              <Dialog.Close className="flex justify-end text-right w-full pr-5 pt-5">
                <Cross1Icon className="w-5 h-5 opacity-50 hover:opacity-100" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-slate-400 p-3 overflow-auto opacity-75">
              {description}
            </Dialog.Description>
            <div className="flex-grow border p-5 w-full h-full overflow-auto">
              {children}
            </div>
            <Dialog.Close className="flex justify-end w-full p-3">
              <Button variant={"destructive"} onClick={() => setOpen(false)}>
                Close
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RightViewModal;
