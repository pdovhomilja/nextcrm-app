"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConnectedAccount } from "@/app/[locale]/(routes)/emails/data";

interface AccountSwitcherProps {
  isCollapsed: boolean;
  accounts: ConnectedAccount[];
  activeAccountId?: string | null;
}

export function AccountSwitcher({
  isCollapsed,
  accounts,
  activeAccountId,
}: AccountSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedAccount = activeAccountId ?? accounts[0]?.id ?? "";

  function switchAccount(id: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("accountId", id);
    router.push(`?${p.toString()}`);
  }

  return (
    <Select value={selectedAccount} onValueChange={switchAccount}>
      <SelectTrigger
        className={cn(
          "flex flex-1 items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
          isCollapsed &&
            "flex h-8 w-8 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden"
        )}
        aria-label="Select account"
      >
        <SelectValue placeholder="Select an account">
          <span className={cn("ml-2", isCollapsed && "hidden")}>
            {accounts.find((account) => account.id === selectedAccount)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-3">
              {account.label} ({account.username})
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
