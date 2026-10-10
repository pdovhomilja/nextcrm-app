import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz/session";
import { AuthorizationError } from "@/lib/authz/errors";
import { assertCanReadAccount, assertCanWriteAccount } from "@/lib/authz/scopes/crm";
import { orderReadScopeWhere } from "@/lib/authz/scopes/orders";
import { writeAuditLog } from "@/lib/audit-log";
import { getDefaultCurrency } from "@/lib/currency";
import { getPrice, rateLookup, resolvePriceListId } from "@/lib/pricing/get-price";
import { PricingError } from "@/lib/pricing/errors";
import { allocateNumber } from "./numbering";
import { lineAmounts, orderTotals, round2 } from "./pricing";
import { serializeOrder } from "./serialize";
import { can, toActor } from "./transitions";
import { OrderError, type HeaderInput, type LineInput } from "./types";

export interface PricingContext { priceListId: string | null; currency: string }

const ADDRESS = ["street", "city", "state", "postal_code", "country"] as const;
const HEADER_KEYS = ["contactId", "note", ...ADDRESS.map((k) => `shipping_${k}`)] as const;
const DETAIL_INCLUDE = {
  lines: { orderBy: { position: "asc" as const } },
  account: { select: { name: true } },
  owner: { select: { name: true } },
  priceList: { select: { name: true } },
};

async function guardAccount(check: () => Promise<void>) {
  try { await check(); } catch (e) { if (e instanceof AuthorizationError) throw new OrderError("notFound"); throw e; }
}

export async function pricingContextForAccount(accountId: string): Promise<PricingContext> {
  const priceListId = await resolvePriceListId(accountId);
  const list = priceListId ? await prismadb.crm_PriceLists.findUnique({ where: { id: priceListId }, select: { currency: true } }) : null;
  return { priceListId: list ? priceListId : null, currency: list?.currency ?? (await getDefaultCurrency()) };
}

export async function priceLine(ctx: PricingContext, input: LineInput, position: number, date: Date = new Date()) {
  const product = await prismadb.crm_Products.findFirst({ where: { id: input.productId, deletedAt: null } });
  if (!product || product.status !== "ACTIVE") throw new OrderError("productInactive");
  let quantity: Decimal;
  try { quantity = new Decimal(String(input.quantity)); } catch { throw new OrderError("invalid"); }
  if (!quantity.gt(0)) throw new OrderError("invalid");
  let listPrice: Decimal;
  let priceRuleId: string | null;
  try {
    const r = await getPrice({ priceListId: ctx.priceListId, productId: product.id, quantity, date });
    const rate = r.currency === ctx.currency ? new Decimal(1) : rateLookup(await prismadb.exchangeRate.findMany())(r.currency, ctx.currency);
    listPrice = round2(r.price.mul(rate));
    priceRuleId = r.ruleId;
  } catch (e) {
    if (e instanceof PricingError) throw new OrderError("pricing", e.message);
    throw e;
  }
  const unitPriceOverridden = input.unitPrice != null && input.unitPrice !== "";
  let unitPrice = listPrice;
  if (unitPriceOverridden) {
    try { unitPrice = round2(new Decimal(String(input.unitPrice))); } catch { throw new OrderError("invalid"); }
  }
  if (unitPrice.lt(0)) throw new OrderError("invalid");
  const vatRate = new Decimal(String(product.tax_rate ?? 0));
  return {
    position, productId: product.id, productName: product.name, sku: product.sku ?? null, unit: product.unit ?? null,
    quantity, listPrice, priceRuleId, unitPrice, unitPriceOverridden, vatRate,
    ...lineAmounts({ quantity, unitPrice, vatRate }),
  };
}
export type PricedLine = Awaited<ReturnType<typeof priceLine>>;

async function assertContact(contactId: string | null | undefined, accountId: string) {
  if (!contactId) return;
  const contact = await prismadb.crm_Contacts.findFirst({ where: { id: contactId }, select: { id: true, accountsIDs: true } });
  if (!contact) throw new OrderError("notFound");
  if (contact.accountsIDs !== accountId) throw new OrderError("contactNotOnAccount");
}

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new OrderError("invalid");
  return d;
}

/** Only the header keys the caller sent; undefined keys are left untouched. */
function headerData(input: HeaderInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of HEADER_KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = typeof v === "string" ? v.trim() || null : v;
  }
  const date = toDate(input.requestedDeliveryDate);
  if (date !== undefined) out.requestedDeliveryDate = date;
  return out;
}

/** Shipping snapshot: the caller's values, else the account's shipping address, else its billing address. */
function shippingFrom(account: Record<string, unknown>, input: HeaderInput) {
  const useShipping = ADDRESS.some((k) => account[`shipping_${k}`]);
  const out: Record<string, string | null> = {};
  for (const k of ADDRESS) {
    const key = `shipping_${k}`;
    const given = (input as Record<string, unknown>)[key];
    out[key] = given !== undefined ? ((given as string | null) || null) : ((account[useShipping ? key : `billing_${k}`] as string | null) ?? null);
  }
  return out;
}

export async function loadOrder(user: AuthzUser, id: string) {
  const order = await prismadb.crm_Orders.findFirst({ where: { id, ...orderReadScopeWhere(user) }, include: DETAIL_INCLUDE });
  if (!order) throw new OrderError("notFound");
  return order;
}

export async function createOrder(user: AuthzUser, input: { accountId: string; lines: LineInput[] } & HeaderInput) {
  await guardAccount(() => assertCanWriteAccount(user, input.accountId));
  const account = await prismadb.crm_Accounts.findFirst({ where: { id: input.accountId, deletedAt: null } });
  if (!account) throw new OrderError("notFound");
  await assertContact(input.contactId, account.id);
  const ctx = await pricingContextForAccount(account.id);
  const lines = await Promise.all(input.lines.map((l, i) => priceLine(ctx, l, i)));
  const header = headerData(input);
  const order = await prismadb.$transaction(async (tx) => {
    const { number, seriesId } = await allocateNumber(tx, "order");
    return tx.crm_Orders.create({
      data: {
        ...header,
        ...shippingFrom(account as unknown as Record<string, unknown>, input),
        number, seriesId, accountId: account.id, ownerId: account.assigned_to ?? null,
        priceListId: ctx.priceListId, currency: ctx.currency,
        ...orderTotals(lines),
        createdBy: user.id, updatedBy: user.id,
        lines: { create: lines },
      },
    });
  });
  await writeAuditLog({ entityType: "order", entityId: order.id, action: "created", changes: null, userId: user.id });
  return { id: order.id, number: order.number };
}

/** Rewrites totals and lines of a DRAFT in one transaction; a non-DRAFT row means someone else moved it. */
export async function saveDraft(order: { id: string }, lines: PricedLine[], userId: string, header: Record<string, unknown> = {}) {
  await prismadb.$transaction(async (tx) => {
    const res = await tx.crm_Orders.updateMany({ where: { id: order.id, status: "DRAFT" }, data: { ...header, ...orderTotals(lines), updatedBy: userId } });
    if (res.count === 0) throw new OrderError("changed");
    await tx.crm_OrderLines.deleteMany({ where: { orderId: order.id } });
    if (lines.length) await tx.crm_OrderLines.createMany({ data: lines.map((l) => ({ ...l, orderId: order.id })) });
  });
}

export async function updateDraft(user: AuthzUser, id: string, input: HeaderInput & { lines: LineInput[] }) {
  const order = await loadOrder(user, id);
  if (!can(order, "edit", toActor(user))) throw new OrderError("forbidden");
  await assertContact(input.contactId, order.accountId);
  const header = headerData(input);
  const lines = await Promise.all(input.lines.map((l, i) => priceLine(order, l, i)));
  await saveDraft(order, lines, user.id, header);
  const changes = [...Object.keys(header).map((field) => ({ field, old: (order as Record<string, unknown>)[field] ?? null, new: header[field] })),
    { field: "lines", old: order.lines.length, new: lines.length }];
  await writeAuditLog({ entityType: "order", entityId: id, action: "updated", changes: changes as never, userId: user.id });
  return { id };
}

export async function deleteDraft(user: AuthzUser, id: string) {
  const order = await loadOrder(user, id);
  if (!can(order, "delete", toActor(user))) throw new OrderError("forbidden");
  const res = await prismadb.crm_Orders.deleteMany({ where: { id, status: "DRAFT" } });
  if (res.count === 0) throw new OrderError("changed");
  await writeAuditLog({ entityType: "order", entityId: id, action: "deleted", changes: null, userId: user.id });
  return { id };
}

export async function listOrders(user: AuthzUser, args: { status?: string; accountId?: string; ownerId?: string; limit: number; offset: number }) {
  const where = {
    ...orderReadScopeWhere(user),
    ...(args.status ? { status: args.status as never } : {}),
    ...(args.accountId ? { accountId: args.accountId } : {}),
    ...(args.ownerId ? { ownerId: args.ownerId } : {}),
  };
  const [rows, total] = await Promise.all([
    prismadb.crm_Orders.findMany({ where, orderBy: { createdAt: "desc" }, take: args.limit, skip: args.offset, include: { account: { select: { name: true } }, owner: { select: { name: true } } } }),
    prismadb.crm_Orders.count({ where }),
  ]);
  return { data: rows.map((r) => serializeOrder(r)), total };
}

/** Price preview for the line editor: from an existing order's context or from an account's. */
export async function quoteLine(user: AuthzUser, input: { accountId?: string; orderId?: string; productId: string; quantity: number | string }) {
  let ctx: PricingContext;
  if (input.orderId) {
    ctx = await loadOrder(user, input.orderId);
  } else {
    if (!input.accountId) throw new OrderError("invalid");
    await guardAccount(() => assertCanReadAccount(user, input.accountId!));
    ctx = await pricingContextForAccount(input.accountId);
  }
  const line = await priceLine(ctx, { productId: input.productId, quantity: input.quantity }, 0);
  return { productName: line.productName, sku: line.sku, unit: line.unit, listPrice: line.listPrice.toFixed(2), vatRate: line.vatRate.toFixed(2), currency: ctx.currency };
}
