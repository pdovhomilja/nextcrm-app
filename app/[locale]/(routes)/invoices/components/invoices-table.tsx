"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string | null;
  type: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  grandTotal: string;
  currency: string;
  account: { id: string; name: string } | null;
  series: { id: string; name: string } | null;
}

type SortField = "number" | "account" | "issueDate" | "dueDate" | "grandTotal" | "status";
type SortDir = "asc" | "desc";

interface InvoicesTableProps {
  invoices: Invoice[];
  statusLabels?: Record<string, string>;
  tableLabels?: {
    number?: string;
    account?: string;
    issueDate?: string;
    dueDate?: string;
    total?: string;
    status?: string;
    type?: string;
    currency?: string;
  };
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

function formatCurrency(amount: string, currency: string) {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function InvoicesTable({
  invoices,
  statusLabels,
  tableLabels,
}: InvoicesTableProps) {
  const [sortField, setSortField] = useState<SortField>("issueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...invoices];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "number":
          cmp = (a.number ?? "").localeCompare(b.number ?? "");
          break;
        case "account":
          cmp = (a.account?.name ?? "").localeCompare(b.account?.name ?? "");
          break;
        case "issueDate":
          cmp = (a.issueDate ?? "").localeCompare(b.issueDate ?? "");
          break;
        case "dueDate":
          cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
          break;
        case "grandTotal":
          cmp = parseFloat(a.grandTotal) - parseFloat(b.grandTotal);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [invoices, sortField, sortDir]);

  const isOverdue = (inv: Invoice) => {
    if (inv.status === "OVERDUE") return true;
    if (
      inv.dueDate &&
      ["ISSUED", "SENT", "PARTIALLY_PAID"].includes(inv.status)
    ) {
      return new Date(inv.dueDate) < new Date();
    }
    return false;
  };

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => toggleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="ml-1">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </TableHead>
  );

  const labels = tableLabels ?? {};

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader field="number">{labels.number ?? "Number"}</SortHeader>
          <SortHeader field="account">{labels.account ?? "Account"}</SortHeader>
          <SortHeader field="issueDate">
            {labels.issueDate ?? "Issued"}
          </SortHeader>
          <SortHeader field="dueDate">{labels.dueDate ?? "Due"}</SortHeader>
          <SortHeader field="grandTotal">
            {labels.total ?? "Total"}
          </SortHeader>
          <SortHeader field="status">{labels.status ?? "Status"}</SortHeader>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((inv) => (
          <TableRow
            key={inv.id}
            className={cn(isOverdue(inv) && "bg-red-50 dark:bg-red-950/20")}
          >
            <TableCell>
              <Link
                href={`/invoices/${inv.id}`}
                className="font-medium text-primary hover:underline"
              >
                {inv.number ?? "DRAFT"}
              </Link>
            </TableCell>
            <TableCell>{inv.account?.name ?? "-"}</TableCell>
            <TableCell>{formatDate(inv.issueDate)}</TableCell>
            <TableCell>{formatDate(inv.dueDate)}</TableCell>
            <TableCell className="font-mono">
              {formatCurrency(inv.grandTotal, inv.currency)}
            </TableCell>
            <TableCell>
              <StatusBadge status={inv.status} labels={statusLabels} />
            </TableCell>
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground py-8"
            >
              No invoices found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
