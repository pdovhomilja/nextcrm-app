import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ contractId }: { contractId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("contract", contractId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="contract"
      entityId={contractId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
