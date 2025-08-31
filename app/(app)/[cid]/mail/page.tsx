import React from "react";
import { redirect } from "next/navigation";
import { getUserMailAccounts } from "@/actions/mail/account-actions";
import { MailClient } from "@/components/mail/mail-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { MailView } from "@/components/mail/mail-view";
import { MailCompose } from "@/components/mail/mail-compose";

import { Button } from "@/components/ui/button";
import { MailReloadButton } from "@/components/mail/mail-reload-button";
import Link from "next/link";

const MailPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ cid: string }>;
  searchParams: Promise<{ account?: string }>;
}) => {
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;
  const { accounts, error } = await getUserMailAccounts();

  if (error) {
    return (
      <SidebarInset>
        <SiteHeader title="Mail">
          <></>
        </SiteHeader>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </SidebarInset>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <SidebarInset>
        <SiteHeader title="Mail">
          <></>
        </SiteHeader>
        <div className="p-4 flex flex-col items-center justify-center h-full w-full ">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>No Mailbox Ready</CardTitle>
              <CardDescription className="text-center p-4">
                No mailbox has been set up yet. Please add a mail account in the
                settings.
              </CardDescription>
              <CardContent className="flex justify-center p-4">
                <Link href={`/${awaitedParams.cid}/settings`}>
                  <Button>Add Mail Account</Button>
                </Link>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      </SidebarInset>
    );
  }

  if (!awaitedSearchParams?.account && accounts.length > 0) {
    redirect(
      `/${awaitedParams.cid}/mail?account=${accounts[0].id}&folder=INBOX`
    );
  }

  return (
    <SidebarInset>
      <SiteHeader title="Mail">
        <div className="flex items-center gap-2">
          <MailReloadButton />
          <MailCompose accounts={accounts || []} />
        </div>
      </SiteHeader>
      <MailClient accounts={accounts || []}>
        <MailView />
      </MailClient>
    </SidebarInset>
  );
};

export default MailPage;
