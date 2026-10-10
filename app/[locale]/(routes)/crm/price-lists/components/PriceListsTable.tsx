"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; name: string; currency: string; isActive: boolean; source: "CRM" | "EXTERNAL"; ruleCount: number; usedAsBase: boolean; updatedAt: string };

export function PriceListsTable({ rows }: { rows: Row[] }) {
  const t = useTranslations("PriceListsPage");
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("name")}</TableHead><TableHead>{t("currency")}</TableHead><TableHead>{t("source")}</TableHead>
          <TableHead>{t("rules")}</TableHead><TableHead>{t("updated")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell><Link className="underline" href={`/crm/price-lists/${r.id}`}>{r.name}</Link> {!r.isActive && <Badge variant="secondary">{t("archived")}</Badge>} {r.usedAsBase && !r.isActive && <Badge variant="outline">{t("baseList")}</Badge>}</TableCell>
            <TableCell>{r.currency}</TableCell>
            <TableCell>{r.source === "EXTERNAL" ? t("sourceExternal") : t("sourceCrm")}</TableCell>
            <TableCell>{r.ruleCount}</TableCell>
            <TableCell>{r.updatedAt.slice(0, 10)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
