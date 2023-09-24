"use client";

import { MessagesSquare } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const InvoiceChat = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <MessagesSquare className="w-6 h-6 m-2 cursor-pointer" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invoice conversation</SheetTitle>
        </SheetHeader>
        content here - in progress
      </SheetContent>
    </Sheet>
  );
};

export default InvoiceChat;
