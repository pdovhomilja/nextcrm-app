import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReactNode } from "react";
import { Button } from "../ui/button";

interface SheetComponentProps {
  button_label: string;
  title?: string;
  description?: string;
  children: ReactNode;
}

const SheetComponent = ({
  button_label,
  title,
  description,
  children,
}: SheetComponentProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="mb-5">{button_label}</Button>
      </SheetTrigger>
      <SheetContent className="">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

export default SheetComponent;
