"use client";

import React, { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../accounts/table-components/columns";
import { NewAccountForm } from "../accounts/components/NewAccountForm";
import { AccountDataTable } from "../accounts/table-components/data-table";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const AccountsView = ({ data, crmData }: any) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const { users, industries } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/accounts")}
              className="cursor-pointer"
            >
              Accounts
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm">+</Button>
              </SheetTrigger>
              <SheetContent className="max-w-3xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create new Account</SheetTitle>
                  <SheetDescription>
                    Add a new company or organization to your CRM system. Fill in the account details and industry information.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <NewAccountForm
                    industries={industries}
                    users={users}
                    onFinish={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <Separator />
      </CardHeader>
      {!data ||
        (data.length === 0 ? (
          <CardContent>No assigned accounts found</CardContent>
        ) : (
          <CardContent>
            <AccountDataTable
              data={data}
              columns={columns}
              industries={industries}
              users={users}
            />
          </CardContent>
        ))}
    </Card>
  );
};

export default AccountsView;
