import { Decimal } from "decimal.js";
import { allowedActions, nextStatuses } from "./transitions";
import { discountPercent, isBelowList } from "./pricing";
import type { OrderActor, OrderState } from "./types";

const money = (v: unknown) => new Decimal(String(v ?? 0)).toFixed(2);
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ?? null);

type Row = Record<string, any> & { lines?: Record<string, any>[] };

export function serializeOrder(order: Row, actor?: OrderActor) {
  const lines = (order.lines ?? []).map((l) => {
    const unitPrice = new Decimal(String(l.unitPrice));
    const listPrice = new Decimal(String(l.listPrice));
    return {
      id: l.id as string, position: l.position as number, productId: l.productId as string,
      productName: l.productName as string, sku: (l.sku ?? null) as string | null, unit: (l.unit ?? null) as string | null,
      quantity: new Decimal(String(l.quantity)).toString(), listPrice: money(l.listPrice), unitPrice: money(l.unitPrice),
      unitPriceOverridden: !!l.unitPriceOverridden, vatRate: money(l.vatRate),
      lineSubtotal: money(l.lineSubtotal), lineVat: money(l.lineVat), lineTotal: money(l.lineTotal),
      belowList: isBelowList({ unitPrice, listPrice }),
      discountPercent: discountPercent({ unitPrice, listPrice })?.toFixed(2) ?? null,
    };
  });
  const state = order as unknown as OrderState;
  return {
    id: order.id as string, number: order.number as string, status: order.status as OrderState["status"], source: order.source as OrderState["source"],
    externalRef: (order.externalRef ?? null) as string | null, accountId: order.accountId as string, accountName: (order.account?.name ?? null) as string | null,
    contactId: (order.contactId ?? null) as string | null, ownerId: (order.ownerId ?? null) as string | null, ownerName: (order.owner?.name ?? null) as string | null,
    priceListId: (order.priceListId ?? null) as string | null, priceListName: (order.priceList?.name ?? null) as string | null, currency: order.currency as string,
    orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString().slice(0, 10) : ((order.orderDate ?? null) as string | null),
    shipping_street: order.shipping_street ?? null, shipping_city: order.shipping_city ?? null, shipping_state: order.shipping_state ?? null,
    shipping_postal_code: order.shipping_postal_code ?? null, shipping_country: order.shipping_country ?? null,
    requestedDeliveryDate: order.requestedDeliveryDate instanceof Date ? order.requestedDeliveryDate.toISOString().slice(0, 10) : null,
    note: (order.note ?? null) as string | null,
    subtotal: money(order.subtotal), vatTotal: money(order.vatTotal), grandTotal: money(order.grandTotal),
    approvalRequestedAt: iso(order.approvalRequestedAt) as string | null, approvedAt: iso(order.approvedAt) as string | null,
    approvedBy: (order.approvedBy ?? null) as string | null, approvalNote: (order.approvalNote ?? null) as string | null,
    createdBy: (order.createdBy ?? null) as string | null, createdAt: iso(order.createdAt) as string, updatedAt: iso(order.updatedAt) as string,
    lines,
    belowListTotal: lines.reduce((s, l) => s.add(Decimal.max(new Decimal(l.listPrice).sub(l.unitPrice).mul(l.quantity), 0)), new Decimal(0)).toFixed(2),
    ...(actor ? { allowedActions: allowedActions(state, actor), nextStatuses: nextStatuses(state.status) } : {}),
  };
}
export type SerializedOrder = ReturnType<typeof serializeOrder>;
