"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMailList } from "@/actions/mail/read-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Email {
  id?: string;
  uid: string;
  from?: string;
  date?: Date;
  subject?: string;
}

export const MailList = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");
  const folderName = searchParams.get("folder");
  const selectedEmail = searchParams.get("email");

  const [data, setData] = useState<{
    emails: Email[];
    total: number;
    error: string | null;
  }>({ emails: [], total: 0, error: null });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accountId && folderName) {
      const fetchEmails = async () => {
        setIsLoading(true);
        const result = await getMailList(accountId, folderName, 1);
        setData({
          emails: result.emails || [],
          total: result.total || 0,
          error: result.error || null,
        });
        setIsLoading(false);
      };
      fetchEmails();
    }
  }, [accountId, folderName]);

  const handleEmailClick = (uid: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("email", uid);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!accountId || !folderName) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an account and folder to see emails.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-2 border-b">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="p-2">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (data.emails.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No emails in this folder.
      </div>
    );
  }

  return (
    <div className="p-2 text-xs">
      <ul className="divide-y">
        {data.emails.map((email) => (
          <li
            key={email.id}
            onClick={() => handleEmailClick(email.uid)}
            className={cn(
              "p-3 hover:bg-muted cursor-pointer",
              selectedEmail === email.uid && "bg-muted",
            )}
          >
            <div className="flex justify-between">
              <p className="font-semibold truncate">{email.from}</p>
              <p className="text-xs text-muted-foreground">
                {email.date ? format(new Date(email.date), "PP") : ""}
              </p>
            </div>
            <p className="text-sm truncate">{email.subject}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
