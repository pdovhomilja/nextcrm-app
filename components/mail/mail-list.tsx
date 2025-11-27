"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMailList, useSearchMail } from "@/lib/hooks/use-mail-queries";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Use cached queries
  const mailListQuery = useMailList(accountId, folderName);
  const searchMailQuery = useSearchMail(
    accountId,
    folderName,
    debouncedSearchQuery
  );

  // Determine which query to use based on search state
  const isSearching = debouncedSearchQuery.trim().length > 0;
  const activeQuery = isSearching ? searchMailQuery : mailListQuery;

  const { data, isLoading, isFetching, dataUpdatedAt } = activeQuery;

  // Update current time every minute for "X minutes ago" display
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const emails = data?.emails || [];
  const queryError = data?.error || null;

  // Calculate minutes since last update (using stored currentTime to avoid impure render)
  const minutesAgo = dataUpdatedAt
    ? Math.floor((currentTime - dataUpdatedAt) / 60000)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <MailSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
      />

      {/* Cache status indicator */}
      {dataUpdatedAt && !isLoading && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-b flex items-center justify-between">
          <span>
            {minutesAgo === 0
              ? "Updated just now"
              : `Updated ${minutesAgo} min ago`}
          </span>
          {isFetching && <span className="text-primary">Refreshing...</span>}
        </div>
      )}

      {isLoading ? (
        <div className="p-2 space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-2 border-b">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      ) : queryError ? (
        <div className="p-2">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{queryError}</AlertDescription>
          </Alert>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          {debouncedSearchQuery.trim()
            ? `No emails found matching "${debouncedSearchQuery}"`
            : "No emails in this folder."}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 text-xs">
          <ul className="divide-y">
            {emails.map((email: Email) => (
              <li
                key={email.id || email.uid}
                onClick={() => handleEmailClick(email.uid)}
                className={cn(
                  "p-3 hover:bg-muted cursor-pointer",
                  selectedEmail === email.uid && "bg-muted"
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
