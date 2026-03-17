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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { columns } from "../opportunities/table-components/columns";
import { NewOpportunityForm } from "../opportunities/components/NewOpportunityForm";
import { OpportunitiesDataTable } from "../opportunities/table-components/data-table";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface OpportunitiesViewProps {
  data: any[];
  crmData: CrmData;
  accountId?: string;
}

const OpportunitiesView = ({
  data,
  crmData,
  accountId,
}: OpportunitiesViewProps) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("CrmPage");

  const { accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>
              <Link href="/crm/opportunities" className="hover:underline">
                {t("opportunities.viewTitle")}
              </Link>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button className="my-2 cursor-pointer" aria-label={t("opportunities.addNew")}>+</Button>
              </SheetTrigger>
              <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{t("opportunities.sheetTitle")}</SheetTitle>
                  <SheetDescription>
                    {t("opportunities.sheetDescription")}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewOpportunityForm
                    accounts={accounts}
                    contacts={contacts}
                    salesType={saleTypes}
                    saleStages={saleStages}
                    campaigns={campaigns}
                    accountId={accountId}
                    onDialogClose={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data ||
          (data.length === 0 ? (
            t("opportunities.empty")
          ) : (
            <OpportunitiesDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default OpportunitiesView;
