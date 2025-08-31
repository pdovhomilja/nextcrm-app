import React from "react";
import { getUserMailAccounts } from "@/actions/mail/account-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RemoveAccountButton } from "./remove-account-button";

export const MailAccountList = async () => {
  const { accounts, error } = await getUserMailAccounts();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No mail accounts have been added yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {accounts.map((account) => (
        <Card key={account.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{account.email}</CardTitle>
              <CardDescription>
                {account.imapHost}:{account.imapPort}
              </CardDescription>
            </div>
            <RemoveAccountButton accountId={account.id} />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};
