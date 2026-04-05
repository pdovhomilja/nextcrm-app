import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getSession } from "@/lib/auth-server";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ productId }: { productId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("product", productId),
    getSession(),
  ]);

  return (
    <AuditTimeline
      entityType="product"
      entityId={productId}
      initialData={initialData}
      role={session?.user?.role ?? "member"}
    />
  );
}
