import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import moment from "moment";
import { RetryEnrichmentButton } from "./RetryEnrichmentButton";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING:   { label: "Pending",     variant: "secondary" } as const,
  RUNNING:   { label: "Running",     variant: "default" } as const,
  COMPLETED: { label: "Completed",   variant: "default" } as const,
  FAILED:    { label: "Failed",      variant: "destructive" } as const,
  SKIPPED:   { label: "Skipped",     variant: "outline" } as const,
};

export default async function EnrichmentJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const records = await prismadb.crm_Contact_Enrichment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      contact: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
      triggered_by_user: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-semibold">Enrichment Jobs</h1>
        </div>
        <Link href="." className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {records.length} enrichment job{records.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No enrichment jobs yet. Start one from the contacts list.
                  </TableCell>
                </TableRow>
              )}
              {records.map((record) => {
                const statusInfo = STATUS_LABELS[record.status as keyof typeof STATUS_LABELS] ?? STATUS_LABELS.PENDING;
                return (
                  <TableRow key={record.id} className={record.status === "RUNNING" ? "bg-muted/30" : ""}>
                    <TableCell>
                      <Link
                        href={`/crm/contacts/${record.contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {record.contact.first_name} {record.contact.last_name}
                      </Link>
                      {record.contact.email && (
                        <div className="text-xs text-muted-foreground">{record.contact.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                      {record.error && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={record.error}>
                          {record.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.fields.join(", ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {moment(record.createdAt).fromNow()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.triggered_by_user?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {record.status === "FAILED" && (
                        <RetryEnrichmentButton
                          contactId={record.contact.id}
                          fields={record.fields}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
