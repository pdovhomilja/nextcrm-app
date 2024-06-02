import React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type RightSheetProps = {
  open?: boolean;
  setOpen: (open: boolean) => void;
  position?: "left" | "right" | "top" | "bottom";
  trigger?: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const FormSheetNoTrigger = ({
  open,
  setOpen,
  position,
  title,
  description,
  children,
}: RightSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={position || "right"}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
};

export default FormSheetNoTrigger;
