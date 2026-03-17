"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { createColumns } from "../contacts/table-components/columns";
import { NewContactForm } from "../contacts/components/NewContactForm";
import { ContactsDataTable } from "../contacts/table-components/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface ContactsViewProps {
  data: any[];
  crmData: CrmData;
  accountId?: string;
}

const ContactsView = ({ data, crmData }: ContactsViewProps) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("CrmPage");

  const { accounts } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>
              <Link href="/crm/contacts" className="hover:underline">
                {t("contacts.viewTitle")}
              </Link>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" aria-label={t("contacts.addNew")}>+</Button>
              </SheetTrigger>
              <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("contacts.sheetTitle")}</SheetTitle>
                  <SheetDescription>
                    {t("contacts.sheetDescription")}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewContactForm
                    accounts={accounts}
                    onFinish={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Separator />
      </CardHeader>

      <CardContent>
        {!data || data.length === 0 ? (
          t("contacts.empty")
        ) : (
          <ContactsDataTable
            data={data}
            columns={createColumns(accounts)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ContactsView;
