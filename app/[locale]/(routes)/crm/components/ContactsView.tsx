"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../contacts/table-components/columns";
import { NewContactForm } from "../contacts/components/NewContactForm";
import { ContactsDataTable } from "../contacts/table-components/data-table";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ContactsView = ({ data, crmData }: any) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, accounts } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/contacts")}
              className="cursor-pointer"
            >
              Contacts
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Sheet open={open} onOpenChange={() => setOpen(false)}>
              <Button
                className="m-2 cursor-pointer"
                onClick={() => setOpen(true)}
              >
                +
              </Button>
              <SheetContent className="min-w-[1000px] space-y-2">
                <SheetHeader>
                  <SheetTitle>Create new Account</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <NewContactForm
                    users={users}
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
          "No assigned contacts found"
        ) : (
          <ContactsDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default ContactsView;
