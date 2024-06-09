"use client";

import { useEffect, useState } from "react";
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
  SheetHeader,
  SheetTitle,
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
  const [isMounted, setIsMounted] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

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
            <Sheet open={open} onOpenChange={() => setOpen(false)}>
              <Button
                className="my-2 cursor-pointer"
                onClick={() => setOpen(true)}
              >
                +
              </Button>
              <SheetContent className="min-w-[1000px] space-y-2">
                <SheetHeader>
                  <SheetTitle>Create new opportunity form</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
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
