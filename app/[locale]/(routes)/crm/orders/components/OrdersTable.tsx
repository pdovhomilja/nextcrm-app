"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";

type Row = { id: string; number: string; accountName: string | null; ownerName: string | null; status: string; grandTotal: string; currency: string; createdAt: string; orderDate: string | null; source: string };

export function OrdersTable({ rows, hideAccount = false }: { rows: Row[]; hideAccount?: boolean }) {
  const t = useTranslations("OrdersPage");
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("number")}</TableHead>
          {!hideAccount && <TableHead>{t("account")}</TableHead>}
          <TableHead>{t("owner")}</TableHead><TableHead>{t("status")}</TableHead>
          <TableHead className="text-right">{t("total")}</TableHead><TableHead>{t("date")}</TableHead><TableHead>{t("source")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell><Link className="underline" href={`/crm/orders/${r.id}`}>{r.number}</Link></TableCell>
            {!hideAccount && <TableCell>{r.accountName}</TableCell>}
            <TableCell>{r.ownerName ?? "—"}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-right">{r.grandTotal} {r.currency}</TableCell>
            <TableCell>{r.orderDate ?? r.createdAt.slice(0, 10)}</TableCell>
            <TableCell>{t(`source${r.source}` as never)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
