"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
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

const OpportunitiesView = ({
  data,
  crmData,
  accountId,
}: {
  data: any;
  crmData: any;
  accountId?: string;
}) => {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const { users, accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  //console.log(accountId, "accountId");
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/opportunities")}
              className="cursor-pointer"
            >
              Opportunities
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button className="my-2 cursor-pointer">+</Button>
              </SheetTrigger>
              <SheetContent className="max-w-3xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create new opportunity</SheetTitle>
                  <SheetDescription>
                    Create a new sales opportunity with account, contact, and
                    deal information
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewOpportunityForm
                    users={users}
                    accounts={accounts}
                    contacts={contacts}
                    salesType={saleTypes}
                    saleStages={saleStages}
                    campaigns={campaigns}
                    accountId={accountId}
                    onDialogClose={() => setDialogOpen(false)}
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
            "No assigned opportunities found"
          ) : (
            <OpportunitiesDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default OpportunitiesView;
