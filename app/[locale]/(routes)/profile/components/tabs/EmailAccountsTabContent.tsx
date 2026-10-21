import Link from "next/link";
import { getEmailAccounts } from "@/actions/emails/accounts";
import { EmailAccountsList } from "../EmailAccountsList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Inbox, Server } from "lucide-react";
import { EmailSendProvider } from "@prisma/client";

export async function EmailAccountsTabContent() {
  const accounts = await getEmailAccounts();
  const hasActiveMailbox = accounts.some((a) => a.isActive);
  const resendMailbox = accounts.find(
    (a) => a.isActive && a.sendProvider === EmailSendProvider.RESEND
  );

  return (
    <div className="max-w-3xl space-y-4 py-2">
      <Alert className="border-primary/30 bg-primary/5">
        <Server className="h-4 w-4" />
        <AlertTitle>SMTP for Outlook, Gmail, Thunderbird</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">
          {resendMailbox ? (
            <>
              You have a mailbox (<strong>{resendMailbox.username}</strong>). Scroll to that card
              and click{" "}
              <strong className="text-foreground">Use in Outlook, Gmail app, etc.</strong> to copy
              SMTP server, port, username, and reveal the password.
            </>
          ) : (
            <>
              You need a <strong>Resend mailbox</strong> on this account first. Ask an admin under{" "}
              <Link href="/admin/email-accounts" className="font-medium text-primary underline-offset-4 hover:underline">
                Administration → Email mailboxes
              </Link>
              , or add one below if your address is on the verified domain.
            </>
          )}
        </AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        Read and send inside the CRM from{" "}
        <Link href="/emails" className="font-medium text-primary underline-offset-4 hover:underline">
          E-mails
        </Link>{" "}
        in the sidebar.
      </p>
      {hasActiveMailbox && (
        <Button asChild className="gap-2">
          <Link href="/emails">
            <Inbox className="h-4 w-4" />
            Open inbox
          </Link>
        </Button>
      )}
      <EmailAccountsList accounts={accounts} />
    </div>
  );
}
