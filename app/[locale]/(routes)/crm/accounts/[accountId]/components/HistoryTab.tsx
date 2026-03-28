import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ accountId }: { accountId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("account", accountId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="account"
      entityId={accountId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
