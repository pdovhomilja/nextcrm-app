"use client";

import { MessagesSquare } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
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
      <SheetContent className="max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice conversation</SheetTitle>
          <SheetDescription>
            Discuss invoice details and comments with team members
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {/* TODO: Implement chat/comments functionality */}
          <p className="text-sm text-muted-foreground">
            Chat functionality coming soon...
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InvoiceChat;
