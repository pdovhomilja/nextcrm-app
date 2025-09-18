"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DebugAiRequests } from "./debug-ai-requests";

export function AiBoardStatusSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 rounded-full h-12 w-12 shadow-lg hover:shadow-xl transition-all duration-200 bg-background border-2"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Open AI Board Status</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>AI Board Generation</SheetTitle>
          <SheetDescription>
            Monitor the status of your AI-generated project boards
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 mx-2">
          <DebugAiRequests />
        </div>
      </SheetContent>
    </Sheet>
  );
}
