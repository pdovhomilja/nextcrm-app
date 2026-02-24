"use client";

import { useState } from "react";

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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const ContactsView = ({ data, crmData }: any) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);

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
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm">+</Button>
              </SheetTrigger>
              <SheetContent className="!w-[850px] max-w-[95vw] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Create new Contact</SheetTitle>
                  <SheetDescription>
                    Add a new contact to your CRM system. Fill in the contact details and assign to an account.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
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
