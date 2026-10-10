import { Decimal } from "decimal.js";
import type { ExternalOrderInput, OrderLineInput, OrderUpdateInput } from "@nextcrm/plugin-sdk";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getDefaultCurrency } from "@/lib/currency";
import { allocateNumber } from "./numbering";
import { lineAmounts, orderTotals, round2 } from "./pricing";
import { canPluginSet } from "./transitions";
import { move } from "./workflow";
import type { OrderState, OrderStatus } from "./types";

/** EXTERNAL lines carry the external system's price as both list and unit price (spec § 3.3). */
async function externalLines(lines: OrderLineInput[]) {
  return Promise.all(lines.map(async (l, position) => {
    const product = await prismadb.crm_Products.findFirst({ where: { id: l.productId, deletedAt: null } });
    if (!product) throw new Error(`Product not found: ${l.productId}`);
    const quantity = new Decimal(String(l.quantity));
    const price = round2(new Decimal(String(l.unitPrice)));
    const vatRate = new Decimal(String(product.tax_rate ?? 0));
    return {
      position, productId: product.id, productName: product.name, sku: product.sku ?? null, unit: product.unit ?? null,
      quantity, listPrice: price, priceRuleId: null, unitPrice: price, unitPriceOverridden: false, vatRate,
      ...lineAmounts({ quantity, unitPrice: price, vatRate }),
    };
  }));
}

export async function pluginCreateOrder(pluginId: string, input: ExternalOrderInput) {
  const account = await prismadb.crm_Accounts.findFirst({ where: { id: input.accountId, deletedAt: null } });
  if (!account) throw new Error(`Account not found: ${input.accountId}`);
  const lines = await externalLines(input.lines);
  const currency = input.currency ?? (await getDefaultCurrency());
  const order = await prismadb.$transaction(async (tx) => {
    const { number, seriesId } = await allocateNumber(tx, "order");
    return tx.crm_Orders.create({
      data: {
        number, seriesId, source: "EXTERNAL", externalRef: input.externalRef, status: input.status,
        accountId: account.id, ownerId: account.assigned_to ?? null, priceListId: null, currency,
        note: input.note ?? null, ...orderTotals(lines), lines: { create: lines },
      },
    });
  });
  await writeAuditLog({ entityType: "order", entityId: order.id, action: "created", changes: [{ field: "plugin", old: null, new: pluginId }] as never, userId: null });
  return order;
}

export async function pluginUpdateOrder(pluginId: string, id: string, input: OrderUpdateInput) {
  const order = await prismadb.crm_Orders.findUnique({ where: { id } });
  if (!order) throw new Error(`Order not found: ${id}`);
  if (input.lines && order.source !== "EXTERNAL") throw new Error("Plugins may replace lines on only EXTERNAL orders");
  const extra: Record<string, unknown> = {};
  if (input.externalRef !== undefined) extra.externalRef = input.externalRef;
  if (input.note !== undefined) extra.note = input.note;
  if (input.lines) {
    const lines = await externalLines(input.lines);
    await prismadb.$transaction(async (tx) => {
      await tx.crm_OrderLines.deleteMany({ where: { orderId: id } });
      if (lines.length) await tx.crm_OrderLines.createMany({ data: lines.map((l) => ({ ...l, orderId: id })) });
    });
    Object.assign(extra, orderTotals(lines));
  }
  const to = input.status as OrderStatus | undefined;
  if (to && to !== order.status) {
    if (!canPluginSet(order as unknown as OrderState, to)) throw new Error(`Plugins cannot set ${to} on a ${order.status} order`);
    await move(order, to, null, extra, { plugin: pluginId });
  } else if (Object.keys(extra).length) {
    await prismadb.crm_Orders.update({ where: { id }, data: extra });
    await writeAuditLog({ entityType: "order", entityId: id, action: "updated", changes: Object.keys(extra).map((field) => ({ field, plugin: pluginId })) as never, userId: null });
  }
  return (await prismadb.crm_Orders.findUnique({ where: { id }, include: { lines: true } })) ?? order;
}
