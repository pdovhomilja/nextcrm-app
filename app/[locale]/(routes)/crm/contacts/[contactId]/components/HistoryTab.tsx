import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ contactId }: { contactId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("contact", contactId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="contact"
      entityId={contactId}
      initialData={initialData}
      role={session?.user?.role ?? "member"}
    />
  );
}
