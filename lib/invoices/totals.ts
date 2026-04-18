import { Decimal } from "decimal.js";

export interface LineInput {
  quantity: Decimal;
  unitPrice: Decimal;
  discountPercent: Decimal;
  taxRate: Decimal;
}

export interface LineTotal {
  lineSubtotal: Decimal;
  lineVat: Decimal;
  lineTotal: Decimal;
}

const TWO_DP = 2;

export function computeLineTotal(line: LineInput): LineTotal {
  const gross = line.quantity.mul(line.unitPrice);
  const discount = gross.mul(line.discountPercent).div(100);
  const lineSubtotal = gross.sub(discount).toDecimalPlaces(TWO_DP);
  const lineVat = lineSubtotal.mul(line.taxRate).div(100).toDecimalPlaces(TWO_DP);
  const lineTotal = lineSubtotal.add(lineVat).toDecimalPlaces(TWO_DP);
  return { lineSubtotal, lineVat, lineTotal };
}

export interface VatBucket {
  rate: string;
  base: string;
  vat: string;
}

export interface InvoiceTotals {
  subtotal: Decimal;
  discountTotal: Decimal;
  vatTotal: Decimal;
  grandTotal: Decimal;
  vatBreakdown: VatBucket[];
}

export function computeInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  let subtotal = new Decimal(0);
  let vatTotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  const buckets = new Map<string, { base: Decimal; vat: Decimal }>();

  for (const line of lines) {
    const { lineSubtotal, lineVat } = computeLineTotal(line);
    subtotal = subtotal.add(lineSubtotal);
    vatTotal = vatTotal.add(lineVat);
    discountTotal = discountTotal.add(
      line.quantity.mul(line.unitPrice).mul(line.discountPercent).div(100),
    );
    const key = line.taxRate.toString();
    const bucket = buckets.get(key) ?? { base: new Decimal(0), vat: new Decimal(0) };
    bucket.base = bucket.base.add(lineSubtotal);
    bucket.vat = bucket.vat.add(lineVat);
    buckets.set(key, bucket);
  }

  const vatBreakdown: VatBucket[] = Array.from(buckets.entries()).map(([rate, b]) => ({
    rate,
    base: b.base.toDecimalPlaces(TWO_DP).toString(),
    vat: b.vat.toDecimalPlaces(TWO_DP).toString(),
  }));

  return {
    subtotal: subtotal.toDecimalPlaces(TWO_DP),
    discountTotal: discountTotal.toDecimalPlaces(TWO_DP),
    vatTotal: vatTotal.toDecimalPlaces(TWO_DP),
    grandTotal: subtotal.add(vatTotal).toDecimalPlaces(TWO_DP),
    vatBreakdown,
  };
}
