import { chosenLists, localDay, type Ctx } from "../settings";
import type { AccountLink, CompareResult, CreatedRecord, CustomerInfo, FailedState, ImportFailed, OpenInvoice, OrderLink, PriceListLink, RunSummary, SendState } from "../store";
import { K } from "../store";

export async function needsOwner(ctx: Ctx): Promise<{ accountId: string; name: string; salesperson: string | null }[]> {
  const out: { accountId: string; name: string; salesperson: string | null }[] = [];
  for (const e of await ctx.store.list("account:")) {
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (acc && acc.deletedAt == null && !acc.assigned_to) out.push({ accountId, name: String(acc.name ?? accountId), salesperson: (e.value as AccountLink).salesperson ?? null });
  }
  return out;
}

export async function panelData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  return {
    partnerId: link.partnerId,
    url: `${ctx.settings.url.replace(/\/+$/, "")}/odoo/contacts/${link.partnerId}`,
    syncedAt: link.syncedAt,
    archived: !!link.archived,
    notCustomer: !!link.notCustomer,
    priceList: link.odooPriceList ? { name: link.odooPriceList[1], imported: !!(await ctx.store.get<PriceListLink>(K.pricelist(link.odooPriceList[0])))?.isActive } : null,
  };
}

export async function catalogData(ctx: Ctx) {
  const chosen = new Set(chosenLists(ctx));
  const loaded = await ctx.store.get<{ at: string; lists: { id: number; name: string; currency: string; rules: number; active: boolean }[] }>(K.odooLists);
  const skipped: { list: string; ruleId: number; reason: string }[] = [];
  for (const e of await ctx.store.list("skipped:")) {
    const link = await ctx.store.get<PriceListLink>(K.pricelist(Number(e.key.slice(8))));
    for (const s of e.value as { ruleId: number; reason: string }[]) skipped.push({ list: link?.name ?? e.key.slice(8), ...s });
  }
  return {
    lists: loaded ? loaded.lists.map((l) => ({ ...l, chosen: chosen.has(l.id) })) : null,
    loadedAt: loaded?.at ?? null,
    skipped,
    compare: await ctx.store.get<CompareResult>(K.compareLast),
    progress: await ctx.store.get<{ done: number; total: number }>(K.compareProgress),
    queued: { sync: !!(await ctx.store.get(K.job("sync"))), compare: !!(await ctx.store.get(K.job("compare"))) },
  };
}

export async function productPanelData(ctx: Ctx, productId: string) {
  const p = await ctx.data.products.get(productId);
  if (!p || p.source !== "EXTERNAL") return null;
  const odooId = Number(p.externalRef);
  if (!(await ctx.store.get(K.product(odooId)))) return null;
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  return { odooId, url: `${ctx.settings.url.replace(/\/+$/, "")}/web#model=product.product&id=${odooId}&view_type=form`, syncedAt: last?.ok ? last.at : null };
}

export async function orderPanelData(ctx: Ctx, orderId: string) {
  const link = await ctx.store.get<OrderLink>(K.order(orderId));
  const status = (await ctx.data.orders.get(orderId))?.status;
  const waiting = status === "READY" ? await ctx.store.get<SendState>(K.send(orderId)) : null;
  const failed = status === "SYNC_FAILED" ? await ctx.store.get<FailedState>(K.failed(orderId)) : null;
  if (!link && !waiting && !failed) return null;
  return {
    link: link ? { ...link, url: `${ctx.settings.url.replace(/\/+$/, "")}/odoo/action-sale.action_orders/${link.odooId}` } : null,
    waiting, failed,
  };
}

export async function ordersData(ctx: Ctx, now: Date) {
  const waiting = ctx.settings.sendOrders ? (await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, take: 500 })).length : 0;
  const since = now.getTime() - 7 * 86_400_000;
  const links = await ctx.store.list("order:");
  const sent = links.filter((e) => !(e.value as OrderLink).imported && Date.parse((e.value as OrderLink).sentAt) >= since).length;
  const importFailed = (await ctx.store.list("importFailed:")).map((e) => ({ odooId: Number(e.key.slice(13)), ...(e.value as ImportFailed) }));
  const failed: ({ orderId: string; number: string } & FailedState)[] = [];
  for (const e of await ctx.store.list("failed:")) {
    const orderId = e.key.slice(7);
    const o = await ctx.data.orders.get(orderId);
    failed.push({ orderId, number: String(o?.number ?? orderId), ...(e.value as FailedState) });
  }
  return {
    enabled: ctx.settings.sendOrders, waiting, sent, failed,
    paused: await ctx.store.get<{ at: string; reason: string }>(K.sendPaused),
    created: (await ctx.store.get<CreatedRecord[]>(K.created)) ?? [],
    imported: { total: links.filter((e) => (e.value as OrderLink).imported).length, lastRun: (await ctx.store.get<{ lastRun: number }>(K.imported))?.lastRun ?? 0, failed: importFailed },
  };
}

const DAY = 86_400_000;
const day = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Spec § 4.6: built from storage and CRM data only; no Odoo call. */
export async function accountTabData(ctx: Ctx, accountId: string, now: Date) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const info = await ctx.store.get<CustomerInfo>(K.customer(accountId));
  const orders: { orderId: string; number: string; odooName: string; date: string; total: number; currency: string; status: string; imported: boolean }[] = [];
  for (const o of await ctx.data.orders.find({ where: { accountId }, orderBy: { orderDate: "desc" }, take: 500 })) {
    const l = await ctx.store.get<OrderLink>(K.order(o.id as string));
    if (!l) continue;
    orders.push({ orderId: o.id as string, number: String(o.number), odooName: l.name, date: day(o.orderDate), total: Number(o.subtotal), currency: String(o.currency), status: String(o.status), imported: !!l.imported });
    if (orders.length === 50) break;
  }
  const today = localDay(ctx, now);
  const invoices = (info?.invoices ?? []).map((i: OpenInvoice) => ({
    ...i, sign: (i.type === "out_refund" ? -1 : 1) as 1 | -1,
    overdueDays: i.due && i.due < today ? Math.round((Date.parse(today) - Date.parse(i.due)) / DAY) : 0,
  }));
  const owed = new Map<string, number>();
  for (const i of invoices) owed.set(i.currency, Math.round(((owed.get(i.currency) ?? 0) + i.sign * i.residual) * 100) / 100);
  const base = ctx.settings.url.replace(/\/+$/, "");
  return {
    partnerId: link.partnerId, url: `${base}/odoo/contacts/${link.partnerId}`, at: info?.at ?? null,
    orders, invoices, owed: Array.from(owed).map(([currency, amount]) => ({ currency, amount })), totals: info?.totals ?? [],
  };
}
