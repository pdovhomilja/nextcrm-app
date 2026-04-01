import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ accountId }: { accountId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("account", accountId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="account"
      entityId={accountId}
      initialData={initialData}
      isAdmin={session?.user?.role === "admin" ?? false}
    />
  );
}
