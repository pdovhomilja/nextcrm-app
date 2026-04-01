import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ leadId }: { leadId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("lead", leadId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="lead"
      entityId={leadId}
      initialData={initialData}
      role={session?.user?.role ?? "member"}
    />
  );
}
