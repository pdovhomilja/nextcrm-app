import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ contractId }: { contractId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("contract", contractId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="contract"
      entityId={contractId}
      initialData={initialData}
      isAdmin={session?.user?.role === "admin" ?? false}
    />
  );
}
