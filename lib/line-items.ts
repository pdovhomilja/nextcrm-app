/**
 * Shared line item calculation utilities.
 * Used by both Opportunity and Contract line item actions.
 */

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number
): number {
  const subtotal = quantity * unitPrice;
  let total: number;

  if (discountType === "PERCENTAGE") {
    total = subtotal * (1 - discountValue / 100);
  } else {
    total = subtotal - discountValue;
  }

  return Math.max(0, Math.round(total * 100) / 100);
}

export function sumLineTotals(
  lineItems: { line_total: number | { toNumber?: () => number } }[]
): number {
  return lineItems.reduce((sum, item) => {
    const total =
      typeof item.line_total === "number"
        ? item.line_total
        : typeof item.line_total === "object" &&
          item.line_total !== null &&
          "toNumber" in item.line_total &&
          typeof item.line_total.toNumber === "function"
        ? item.line_total.toNumber()
        : 0;
    return sum + total;
  }, 0);
}
