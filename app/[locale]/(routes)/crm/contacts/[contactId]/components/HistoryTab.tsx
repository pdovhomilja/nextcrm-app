import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ contactId }: { contactId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("contact", contactId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="contact"
      entityId={contactId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
