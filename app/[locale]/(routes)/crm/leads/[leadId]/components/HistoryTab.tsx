import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ leadId }: { leadId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("lead", leadId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="lead"
      entityId={leadId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
