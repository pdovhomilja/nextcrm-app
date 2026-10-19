"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { mailboxShortLabel } from "@/lib/email/mailbox-display-name";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConnectedAccount } from "@/app/[locale]/(routes)/emails/data";

interface AccountSwitcherProps {
  accounts: ConnectedAccount[];
  activeAccountId?: string | null;
}

export function AccountSwitcher({ accounts, activeAccountId }: AccountSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAccount = activeAccountId ?? accounts[0]?.id ?? "";
  const active = accounts.find((account) => account.id === selectedAccount);

  function switchAccount(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("accountId", id);
    router.push(`?${p.toString()}`);
  }

  const shortLabel = mailboxShortLabel(active?.label ?? "Mail");

  if (accounts.length <= 1) {
    return (
      <div
        className="flex h-8 w-full items-center justify-center rounded-md bg-muted/50 px-1.5 text-xs font-medium text-foreground"
        title={active?.label ?? active?.username}
      >
        <span className="truncate">{shortLabel}</span>
      </div>
    );
  }

  return (
    <Select value={selectedAccount} onValueChange={switchAccount}>
      <SelectTrigger
        className={cn(
          "h-8 w-full gap-1 px-2 text-xs font-medium",
          "[&>span]:line-clamp-1 [&>span]:truncate"
        )}
        aria-label="View mailbox as"
      >
        <SelectValue placeholder="Mail">
          <span className="truncate">{shortLabel}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="max-w-[min(100vw-2rem,18rem)]">
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id} className="text-xs">
            <span className="truncate">{mailboxShortLabel(account.label)}</span>
            <span className="ml-1 text-muted-foreground">({account.username})</span>
            {account.accessKind && account.accessKind !== "owner" && (
              <span className="ml-1 text-[10px] uppercase text-amber-600 dark:text-amber-400">
                {account.accessKind === "delegate" ? "delegated" : "team"}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
