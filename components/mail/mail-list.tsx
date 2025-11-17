"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMailList, searchMail } from "@/actions/mail/read-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { MailSearch } from "./mail-search";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (accountId && folderName) {
      const fetchEmails = async () => {
        setIsLoading(true);
        let result;

        if (debouncedSearchQuery.trim()) {
          // Perform search if there's a search query
          result = await searchMail(accountId, folderName, debouncedSearchQuery);
        } else {
          // Otherwise, fetch regular mail list
          result = await getMailList(accountId, folderName, 1);
        }

        setData({
          emails: result.emails || [],
          total: result.total || 0,
          error: result.error || null,
        });
        setIsLoading(false);
      };
      fetchEmails();
    }
  }, [accountId, folderName, debouncedSearchQuery]);

  const handleEmailClick = (uid: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("email", uid);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  if (!accountId || !folderName) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select an account and folder to see emails.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MailSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
      />

      {isLoading ? (
        <div className="p-2 space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-2 border-b">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      ) : data.error ? (
        <div className="p-2">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{data.error}</AlertDescription>
          </Alert>
        </div>
      ) : data.emails.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          {debouncedSearchQuery.trim()
            ? `No emails found matching "${debouncedSearchQuery}"`
            : "No emails in this folder."}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 text-xs">
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
      )}
    </div>
  );
};
