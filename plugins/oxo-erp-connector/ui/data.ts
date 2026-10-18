import { chosenLists, findAll, type Ctx } from "../settings";
import { K, type AccountLink, type FailedState, type OrderLink, type PriceListLink, type ProductLink, type SendState } from "../store";

const base = (ctx: Ctx) => ctx.settings.url.replace(/\/+$/, "");

/** Every linked account without an owner (§ 10 A6). */
export async function needsOwner(ctx: Ctx): Promise<{ accountId: string; name: string }[]> {
  const out: { accountId: string; name: string }[] = [];
  for (const e of await ctx.store.list("account:")) {
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (acc && acc.deletedAt == null && !acc.assigned_to) out.push({ accountId, name: String(acc.name ?? accountId) });
  }
  return out;
}

export async function panelData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const list = link.priceListId != null ? await ctx.store.get<PriceListLink>(K.pricelist(link.priceListId)) : null;
  return {
    customerId: link.customerId, syncedAt: link.syncedAt, inactive: !!link.inactive,
    priceList: link.priceListId != null ? { id: link.priceListId, name: list?.name ?? null, imported: !!list?.isActive } : null,
    addresses: link.addresses.map((a) => ({ id: a.id, text: [a.name, a.street, [a.zip, a.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") })),
  };
}

export async function productPanelData(ctx: Ctx, productId: string) {
  const link = await ctx.store.get<ProductLink>(K.product(productId));
  return link ? { oxoId: link.oxoId, ref: link.ref } : null;
}

export async function orderPanelData(ctx: Ctx, orderId: string) {
  const link = await ctx.store.get<OrderLink>(K.order(orderId));
  const status = (await ctx.data.orders.get(orderId))?.status;
  const waiting = status === "READY" ? await ctx.store.get<SendState>(K.send(orderId)) : null;
  const failed = status === "SYNC_FAILED" ? await ctx.store.get<FailedState>(K.failed(orderId)) : null;
  if (!link && !waiting && !failed) return null;
  return { link: link ? { ...link, url: `${base(ctx)}/prodej/${link.oxoId}` } : null, waiting, failed };
}

const day = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Built from storage and CRM data only; no OXO ERP call. */
export async function accountTabData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const orders: { orderId: string; number: string; oxoNumber: string; date: string; total: number; currency: string; status: string; delivery: string; imported: boolean }[] = [];
  for (const o of await findAll(ctx.data.orders, { accountId }, { orderDate: "desc" })) {
    const l = await ctx.store.get<OrderLink>(K.order(o.id as string));
    if (!l) continue;
    orders.push({ orderId: o.id as string, number: String(o.number), oxoNumber: l.number, date: day(o.orderDate), total: Number(o.subtotal), currency: String(o.currency), status: String(o.status), delivery: l.delivery, imported: !!l.imported });
    if (orders.length === 50) break;
  }
  return { customerId: link.customerId, orders };
}

export async function catalogData(ctx: Ctx) {
  const chosen = new Set(chosenLists(ctx));
  const loaded = await ctx.store.get<{ at: string; lists: { id: number; odooId: number | null; name: string; currency: string; rules: number }[] }>(K.oxoLists);
  const skipped: { list: string; ruleId: number; reason: string }[] = [];
  for (const e of await ctx.store.list("skipped:")) {
    const link = await ctx.store.get<PriceListLink>(K.pricelist(Number(e.key.slice(8))));
    for (const s of e.value as { ruleId: number; reason: string }[]) skipped.push({ list: link?.name ?? e.key.slice(8), ...s });
  }
  return {
    lists: loaded ? loaded.lists.map((l) => ({ ...l, chosen: chosen.has(l.id) })) : null,
    loadedAt: loaded?.at ?? null, skipped, queued: !!(await ctx.store.get(K.job)),
  };
}

export async function ordersData(ctx: Ctx, now: Date) {
  const waiting = ctx.settings.sendOrders ? (await findAll(ctx.data.orders, { status: "READY", externalRef: null })).length : 0;
  const since = now.getTime() - 7 * 86_400_000;
  const sent = (await ctx.store.list("order:")).filter((e) => !(e.value as OrderLink).imported && Date.parse((e.value as OrderLink).sentAt) >= since).length;
  const failed: ({ orderId: string; number: string } & FailedState)[] = [];
  for (const e of await ctx.store.list("failed:")) {
    const orderId = e.key.slice(7);
    const o = await ctx.data.orders.get(orderId);
    failed.push({ orderId, number: String(o?.number ?? orderId), ...(e.value as FailedState) });
  }
  return {
    enabled: ctx.settings.sendOrders, waiting, sent, failed,
    paused: await ctx.store.get<{ at: string; reason: string }>(K.sendPaused),
    pending: (await ctx.store.list("pending:")).length,
  };
}
