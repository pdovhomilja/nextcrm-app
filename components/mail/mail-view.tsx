"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getMailContent } from "@/actions/mail/read-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeHtmlRenderer } from "./safe-html-renderer";
import { format } from "date-fns";

interface MailContent {
  id?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: Date;
  html?: string;
  text?: string;
  error?: string;
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

  return (
    <div className="p-4 text-xs">
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
