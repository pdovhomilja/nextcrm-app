import { getEmailAccounts } from "@/actions/emails/accounts";
import { EmailAccountsList } from "../EmailAccountsList";

export async function EmailAccountsTabContent() {
  const accounts = await getEmailAccounts();
  return (
    <div className="max-w-3xl py-2">
      <EmailAccountsList accounts={accounts} />
    </div>
  );
}
