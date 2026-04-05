"use client";

import Link from "next/link";
import moment from "moment";
import { Decimal } from "@prisma/client/runtime/client";
import { formatCurrency } from "@/lib/currency-format";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  status: string;
  quantity: number;
  custom_price: number | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  renewal_date: string | Date | null;
  account: { id: string; name: string };
}

interface AccountsTabProps {
  assignments: Assignment[];
  productPrice: number;
  productCurrency: string;
}

const statusColor: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  SUSPENDED: "destructive",
  CANCELLED: "destructive",
};

export function AccountsTab({
  assignments,
  productPrice,
  productCurrency,
}: AccountsTabProps) {
  const formatDate = (date: string | Date | null | undefined) =>
    date ? moment(date).format("MMM DD, YYYY") : "-";

  const formatPrice = (value: number | null) => {
    const amount = value ?? productPrice;
    return formatCurrency(new Decimal(amount.toString()), productCurrency);
  };

  if (!assignments || assignments.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No accounts assigned to this product yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Renewal Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link
                href={`/crm/accounts/${a.account.id}`}
                className="underline hover:text-foreground"
              >
                {a.account.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusColor[a.status] ?? "secondary"}>
                {a.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{a.quantity}</TableCell>
            <TableCell className="text-right">
              {formatPrice(a.custom_price)}
            </TableCell>
            <TableCell>{formatDate(a.start_date)}</TableCell>
            <TableCell>{formatDate(a.end_date)}</TableCell>
            <TableCell>{formatDate(a.renewal_date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
