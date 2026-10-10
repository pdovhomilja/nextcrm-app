import { Decimal } from "decimal.js";
import type { ExternalOrderInput, OrderLineInput, OrderUpdateInput } from "@nextcrm/plugin-sdk";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getDefaultCurrency } from "@/lib/currency";
import { allocateNumber } from "./numbering";
import { lineAmounts, orderTotals, round2 } from "./pricing";
import { canPluginSet } from "./transitions";
import { auditStatus } from "./workflow";
import { OrderError, type OrderState, type OrderStatus } from "./types";

/** Statuses a plugin may create an EXTERNAL order in (spec § 3.3, plan Ruling 6). */
const CREATE_STATUSES = new Set(["SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID", "CANCELLED"]);

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
  if (!CREATE_STATUSES.has(input.status)) throw new Error(`Plugins cannot create an order as ${input.status}`);
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
  const to = input.status as OrderStatus | undefined;
  const moving = !!to && to !== order.status;
  if (moving && !canPluginSet(order as unknown as OrderState, to!)) throw new Error(`Plugins cannot set ${to} on a ${order.status} order`);
  const extra: Record<string, unknown> = {};
  if (input.externalRef !== undefined) extra.externalRef = input.externalRef;
  if (input.note !== undefined) extra.note = input.note;
  const lines = input.lines ? await externalLines(input.lines) : null;
  if (lines) Object.assign(extra, orderTotals(lines));
  if (!moving && !Object.keys(extra).length) return order;
  // Header, status and lines in one transaction; the status update only matches the status we read.
  await prismadb.$transaction(async (tx) => {
    if (moving) {
      const res = await tx.crm_Orders.updateMany({ where: { id, status: order.status }, data: { ...extra, status: to, updatedBy: null } });
      if (res.count === 0) throw new OrderError("changed");
    } else {
      await tx.crm_Orders.update({ where: { id }, data: extra });
    }
    if (lines) {
      await tx.crm_OrderLines.deleteMany({ where: { orderId: id } });
      if (lines.length) await tx.crm_OrderLines.createMany({ data: lines.map((l) => ({ ...l, orderId: id })) });
    }
  });
  if (moving) await auditStatus(id, order.status, to!, null, { plugin: pluginId });
  const fields = Object.keys(extra).filter((k) => !["subtotal", "vatTotal", "grandTotal"].includes(k));
  if (fields.length || lines) {
    await writeAuditLog({ entityType: "order", entityId: id, action: "updated", changes: [...fields, ...(lines ? ["lines"] : [])].map((field) => ({ field, plugin: pluginId })) as never, userId: null });
  }
  return (await prismadb.crm_Orders.findUnique({ where: { id }, include: { lines: true } })) ?? order;
}
