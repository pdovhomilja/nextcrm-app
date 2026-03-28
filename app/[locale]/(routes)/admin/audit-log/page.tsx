import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogAdmin } from "@/actions/crm/audit-log/get-audit-log-admin";
import { AuditAdminTable } from "@/components/crm/audit-log/AdminTable";

const AuditLogPage = async (props: {
  searchParams?: Promise<{ page?: string }>;
}) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) redirect("/");

  const searchParams = await props.searchParams;
  const currentPage = Math.max(
    1,
    parseInt(searchParams?.page ?? "1", 10) || 1
  );

  const result = await getAuditLogAdmin({ page: currentPage });
  if ("error" in result) return <div>Access denied</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete history of all CRM changes.
        </p>
      </div>
      <AuditAdminTable
        entries={result.data}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        isAdmin
      />
    </div>
  );
};

export default AuditLogPage;
