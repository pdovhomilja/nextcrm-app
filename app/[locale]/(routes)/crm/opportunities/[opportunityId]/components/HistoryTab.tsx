import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ opportunityId }: { opportunityId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("opportunity", opportunityId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="opportunity"
      entityId={opportunityId}
      initialData={initialData}
      isAdmin={session?.user?.role === "admin" ?? false}
    />
  );
}
