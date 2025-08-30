import React from 'react';
import { getUserMailAccounts } from '@/actions/mail/account-actions';
import { MailClient } from '@/components/mail/mail-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';

const MailPage = async () => {
  const { accounts, error } = await getUserMailAccounts();

  if (error) {
    return (
      <SidebarInset>
        <SiteHeader title="Mail"><></></SiteHeader>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <SiteHeader title="Mail"><></></SiteHeader>
      <MailClient accounts={accounts || []} />
    </SidebarInset>
  );
};

export default MailPage;
