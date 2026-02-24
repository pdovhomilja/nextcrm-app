"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { columns } from "../leads/table-components/columns";
import { NewLeadForm } from "../leads/components/NewLeadForm";
import { LeadDataTable } from "../leads/table-components/data-table";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface LeadsViewProps {
  data: any[];
  crmData: CrmData;
}

const LeadsView = ({ data, crmData }: LeadsViewProps) => {
  const { users, accounts } = crmData;
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>
              <Link href="/crm/leads" className="hover:underline">
                Leads
              </Link>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" aria-label="Add new lead">+</Button>
              </SheetTrigger>
              <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create new lead</SheetTitle>
                  <SheetDescription>Fill in the details to create a new lead</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewLeadForm users={users} accounts={accounts} onFinish={() => setOpen(false)} />
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
            "No assigned leads found"
          ) : (
            <LeadDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default LeadsView;
