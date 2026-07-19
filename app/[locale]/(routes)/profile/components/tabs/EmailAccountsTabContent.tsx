import { getEmailAccounts } from "@/actions/emails/accounts";
import { EmailAccountsList } from "../EmailAccountsList";
import { CalendarConnectionsList } from "../CalendarConnectionsList";

export async function EmailAccountsTabContent() {
  const accounts = await getEmailAccounts();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          Email Accounts
        </h3>
        <EmailAccountsList accounts={accounts} />
      </div>
      <CalendarConnectionsList />
    </div>
  );
}
