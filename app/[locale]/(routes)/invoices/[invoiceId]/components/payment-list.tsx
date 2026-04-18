"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: string;
  paidAt: string;
  amount: string;
  method: string | null;
  reference: string | null;
  note: string | null;
}

interface PaymentListProps {
  payments: Payment[];
  currency: string;
  locale: string;
}

export function PaymentList({ payments, currency, locale }: PaymentListProps) {
  const fmt = (n: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "CZK",
      minimumFractionDigits: 2,
    }).format(parseFloat(n));

  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No payments recorded
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              {new Date(p.paidAt).toLocaleDateString(locale)}
            </TableCell>
            <TableCell className="font-mono">{fmt(p.amount)}</TableCell>
            <TableCell>{p.method ?? "-"}</TableCell>
            <TableCell>{p.reference ?? "-"}</TableCell>
            <TableCell>{p.note ?? "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
