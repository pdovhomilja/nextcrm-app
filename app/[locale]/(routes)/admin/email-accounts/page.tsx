import Container from "../../components/ui/Container";
import { EmailAccountsList } from "../../profile/components/EmailAccountsList";
import {
  getAdminEmailAccounts,
  getUsersForEmailAccountAssignment,
} from "@/actions/admin/email-accounts";
import { EmailMailboxStats } from "./EmailMailboxStats";
import { EmailEnvConfigPanel } from "./EmailEnvConfigPanel";

export default async function AdminEmailAccountsPage() {
  const [accounts, users] = await Promise.all([
    getAdminEmailAccounts(),
    getUsersForEmailAccountAssignment(),
  ]);

  return (
    <Container
      title="Email mailboxes"
      description="Team inboxes on Resend only — API for sending, webhook for receiving. No mail server needed."
    >
      <div className="mx-auto max-w-4xl space-y-8 pb-8">
        <EmailMailboxStats accounts={accounts} />
        <EmailEnvConfigPanel />
        <EmailAccountsList accounts={accounts} admin assignableUsers={users} />
      </div>
    </Container>
  );
}
