"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LineItemValues {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
}

interface TotalsPanelProps {
  lineItems: LineItemValues[];
  currency: string;
}

function computeLineTotals(line: LineItemValues) {
  const gross = line.quantity * line.unitPrice;
  const discount = (gross * line.discountPercent) / 100;
  const subtotal = Math.round((gross - discount) * 100) / 100;
  const vat = Math.round((subtotal * line.taxRate) / 100 * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;
  return { subtotal, vat, total };
}

export function TotalsPanel({ lineItems, currency }: TotalsPanelProps) {
  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    let discountTotal = 0;
    const vatBuckets = new Map<number, { base: number; vat: number }>();

    for (const line of lineItems) {
      const lt = computeLineTotals(line);
      subtotal += lt.subtotal;
      vatTotal += lt.vat;

      const gross = line.quantity * line.unitPrice;
      discountTotal += (gross * line.discountPercent) / 100;

      const bucket = vatBuckets.get(line.taxRate) ?? { base: 0, vat: 0 };
      bucket.base += lt.subtotal;
      bucket.vat += lt.vat;
      vatBuckets.set(line.taxRate, bucket);
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      vatTotal: Math.round(vatTotal * 100) / 100,
      grandTotal: Math.round((subtotal + vatTotal) * 100) / 100,
      vatBreakdown: Array.from(vatBuckets.entries())
        .filter(([rate]) => rate > 0)
        .map(([rate, b]) => ({
          rate,
          base: Math.round(b.base * 100) / 100,
          vat: Math.round(b.vat * 100) / 100,
        })),
    };
  }, [lineItems]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "CZK",
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono">{fmt(totals.subtotal)}</span>
        </div>
        {totals.discountTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-mono text-red-600">
              -{fmt(totals.discountTotal)}
            </span>
          </div>
        )}
        {totals.vatBreakdown.map((b) => (
          <div key={b.rate} className="flex justify-between">
            <span className="text-muted-foreground">VAT {b.rate}%</span>
            <span className="font-mono">{fmt(b.vat)}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span className="font-mono">{fmt(totals.grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
