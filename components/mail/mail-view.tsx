"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMailContent } from "@/actions/mail/read-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeHtmlRenderer } from "./safe-html-renderer";
import { format } from "date-fns";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { SidebarMenuButton } from "../ui/sidebar";
import { IconCirclePlusFilled } from "@tabler/icons-react";

import QuickCreateForm from "../quickcreate/form/quick-create-form";

interface MailContent {
  id?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: Date;
  html?: string;
  text?: string;
  error?: string;
  nextUid?: string;
  previousUid?: string;
}

export const MailView = () => {
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");
  const folderName = searchParams.get("folder");
  const mailUid = searchParams.get("email");

  const [data, setData] = useState<MailContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accountId && folderName && mailUid) {
      const fetchContent = async () => {
        setIsLoading(true);
        const result = await getMailContent(accountId, folderName, mailUid);
        setData(result);
        setIsLoading(false);
      };
      fetchContent();
    }
  }, [accountId, folderName, mailUid]);

  if (!mailUid) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an email to read.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 mt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;
  console.log("mailUid", mailUid);

  return (
    <div className="p-4 text-xs">
      <div className="flex justify-between pb-4">
        <Sheet>
          <SheetTrigger>
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Create Task from Email</span>
            </SidebarMenuButton>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Quick Create</SheetTitle>
            </SheetHeader>
            <QuickCreateForm emailData={data} />
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex items-center justify-between">
        <h2 className=" font-bold text-xs">{data.subject}</h2>
        <p className="text-xs text-muted-foreground">
          {data.date ? format(new Date(data.date), "PPpp") : ""}
        </p>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        <p>From: {data.from}</p>
        <p>To: {data.to}</p>
      </div>
      <div className="mt-8 prose dark:prose-invert max-w-none">
        <SafeHtmlRenderer html={data.html || data.text || ""} />
      </div>
    </div>
  );
};
