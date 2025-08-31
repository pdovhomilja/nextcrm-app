"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AccountSwitcher } from "./account-switcher";
import { FolderList } from "./folder-list";
import { MailList } from "./mail-list";
import { Separator } from "@/components/ui/separator";

interface MailClientProps {
  accounts: {
    id: string;
    email: string;
  }[];
  children: React.ReactNode;
}

export const MailClient = ({ accounts, children }: MailClientProps) => {
  const searchParams = useSearchParams();
  const selectedAccount = searchParams.get("account");

  const defaultLayout = [265, 440, 655];

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full max-h-screen items-stretch"
    >
      <ResizablePanel defaultSize={defaultLayout[0]} minSize={20}>
        <div className="p-2">
          <AccountSwitcher accounts={accounts} />
        </div>
        <Separator />
        {selectedAccount && <FolderList accountId={selectedAccount} />}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[1]} minSize={20}>
        <MailList />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[2]}>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
};
