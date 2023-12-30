"use client";

import { ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross1Icon } from "@radix-ui/react-icons";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const RightViewModalNoTrigger = ({
  title,
  description,
  children,
  open,
  setOpen,
}: Props) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-[dialog-overlay-show_1000ms] data-[state=closed]:animate-[dialog-overlay-hide_1000ms] fixed inset-0 bg-black/50" />
        <Dialog.Content
          className={
            "data-[state=open]:animate-[dialog-content-show_1000ms] data-[state=closed]:animate-[dialog-content-hide_1000ms] fixed top-0 right-0 rounded-md border  h-full bg-white dark:bg-slate-900 shadow-md overflow-hidden"
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between w-full">
              <Dialog.Title className="font-semibold p-3 w-full" asChild>
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                  {title}
                </h4>
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
            <div className="flex justify-end p-3">
              <Dialog.Close className="" asChild>
                <Button variant={"destructive"} onClick={() => setOpen(false)}>
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RightViewModalNoTrigger;
