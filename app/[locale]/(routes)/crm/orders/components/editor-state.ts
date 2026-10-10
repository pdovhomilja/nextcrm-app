import { Decimal } from "decimal.js";
import { isBelowList, lineAmounts, orderTotals } from "@/lib/orders/pricing";
import type { LineInput } from "@/lib/orders/types";

/** `unitPrice` is "" while the line follows the list price. */
export type EditorLine = { key: string; productId: string; productName: string; quantity: string; listPrice: string; unitPrice: string; vatRate: string };

const dec = (v: string) => { try { return new Decimal(v || 0); } catch { return new Decimal(0); } };
const effective = (r: EditorLine) => (r.unitPrice === "" ? dec(r.listPrice) : dec(r.unitPrice));

export function toLineInputs(rows: EditorLine[]): LineInput[] {
  return rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: r.quantity, unitPrice: r.unitPrice === "" ? null : r.unitPrice }));
}

export function editorTotals(rows: EditorLine[]) {
  const lines = rows.filter((r) => r.productId).map((r) => lineAmounts({ quantity: dec(r.quantity), unitPrice: effective(r), vatRate: dec(r.vatRate) }));
  const t = orderTotals(lines);
  return {
    subtotal: t.subtotal.toFixed(2), vatTotal: t.vatTotal.toFixed(2), grandTotal: t.grandTotal.toFixed(2),
    belowList: rows.some((r) => r.productId && isBelowList({ unitPrice: effective(r), listPrice: dec(r.listPrice) })),
  };
}

export const lineIsBelow = (r: EditorLine) => isBelowList({ unitPrice: effective(r), listPrice: dec(r.listPrice) });
export const lineTotal = (r: EditorLine) => lineAmounts({ quantity: dec(r.quantity), unitPrice: effective(r), vatRate: dec(r.vatRate) }).lineTotal.toFixed(2);
