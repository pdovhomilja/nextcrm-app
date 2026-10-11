import Link from "next/link";
import { getEmailAccounts } from "@/actions/emails/accounts";
import { EmailAccountsList } from "../EmailAccountsList";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export async function EmailAccountsTabContent() {
  const accounts = await getEmailAccounts();
  const hasActiveMailbox = accounts.some((a) => a.isActive);

  return (
    <div className="max-w-3xl space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Manage Resend mailboxes here. To read and send mail, use{" "}
        <Link href="/emails" className="font-medium text-primary underline-offset-4 hover:underline">
          E-mails
        </Link>{" "}
        in the left sidebar (Inbox, Sent, Compose).
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
