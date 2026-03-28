import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ opportunityId }: { opportunityId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("opportunity", opportunityId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="opportunity"
      entityId={opportunityId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
