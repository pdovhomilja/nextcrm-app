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
import { useTranslations } from "next-intl";

interface AccountSettingsSheetProps {
  initialData: MyAccount | null;
}

export function AccountSettingsSheet({ initialData }: AccountSettingsSheetProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("InvoicePage");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>{t("settings.title")}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("settings.companySettings")}</SheetTitle>
          <SheetDescription>
            {t("settings.description")}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <MyAccountSettingsForm initialData={initialData} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
