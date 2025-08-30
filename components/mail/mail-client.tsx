'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AccountSwitcher } from './account-switcher';
import { FolderList } from './folder-list';
import { MailList } from './mail-list';
import { MailView } from './mail-view';
import { MailCompose } from './mail-compose';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MailClientProps {
  accounts: {
    id: string;
    email: string;
  }[];
}

export const MailClient = ({ accounts }: MailClientProps) => {
  const searchParams = useSearchParams();
  const selectedAccount = searchParams.get('account');
  const [isComposing, setIsComposing] = React.useState(false);

  const defaultLayout = [265, 440, 655];

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full max-h-screen items-stretch"
      
    >
      <ResizablePanel defaultSize={defaultLayout[0]} minSize={30}>
        <div className="p-2 flex justify-between">
          <AccountSwitcher accounts={accounts} />
          <Button onClick={() => setIsComposing(true)}>Compose</Button>
        </div>
        <Separator />
        {selectedAccount && <FolderList accountId={selectedAccount} />}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
        <MailList />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[2]}>
        {isComposing ? <MailCompose /> : <MailView />}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
