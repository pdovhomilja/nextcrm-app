"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MyAccountSettingsForm } from "./MyAccountSettingsForm";
import { MyAccount } from "@prisma/client";

interface AccountSettingsSheetProps {
  initialData: MyAccount | null;
}

export function AccountSettingsSheet({ initialData }: AccountSettingsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>Settings</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your company settings</SheetTitle>
          <SheetDescription>
            This data will be used as default values for your invoices. You can change them at any time. Very important is to set account email which will receive files for import to ERPs
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <MyAccountSettingsForm initialData={initialData} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
