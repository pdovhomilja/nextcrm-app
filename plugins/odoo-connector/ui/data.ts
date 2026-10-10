import { chosenLists, type Ctx } from "../settings";
import type { AccountLink, CompareResult, PriceListLink, RunSummary } from "../store";
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
