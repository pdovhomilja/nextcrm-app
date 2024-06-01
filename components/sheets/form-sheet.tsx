import React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "../ui/button";

type RightSheetProps = {
  position?: "left" | "right" | "top" | "bottom";
  trigger: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const FormSheet = ({
  position,
  trigger,
  title,
  description,
  children,
}: RightSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="mb-5">{trigger}</Button>
      </SheetTrigger>
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

export default FormSheet;
