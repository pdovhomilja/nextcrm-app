import React from 'react';
import { MailAccountForm } from './mail-account-form';
import { MailAccountList } from './mail-account-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const MailSettings = () => {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mail Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <MailAccountList />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Add New Mail Account</CardTitle>
        </CardHeader>
        <CardContent>
          <MailAccountForm />
        </CardContent>
      </Card>
    </div>
  );
};
