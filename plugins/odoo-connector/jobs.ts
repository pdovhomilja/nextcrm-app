import { jsonClient, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K } from "./store";
import * as sync from "./sync";
import * as compare from "./compare";

export async function queueJob(ctx: Ctx, name: "sync" | "compare", now: Date): Promise<string> {
  await ctx.store.set(K.job(name), { requestedAt: now.toISOString() });
  return ctx.t("admin.queued");
}

/** Queued admin jobs run on the cron, one at a time: a sync before a compare (catalog spec § 4.7). */
export async function runQueued(ctx: Ctx, now: Date, client: OdooClient = jsonClient(ctx)): Promise<void> {
  const lock = await ctx.store.get<{ until: string }>(K.lock);
  if (lock && Date.parse(lock.until) > now.getTime()) return;
  if (await ctx.store.get(K.job("sync"))) {
    try { await sync.runSync(ctx, client, now); } finally { await ctx.store.delete(K.job("sync")); }
  }
  if (await ctx.store.get(K.job("compare"))) {
    try { await compare.runCompare(ctx, client, now); } finally { await ctx.store.delete(K.job("compare")); }
  }
}

export async function loadPriceLists(ctx: Ctx, client: OdooClient = jsonClient(ctx)): Promise<string> {
  const rows = await client.call<{ id: number; name: string; currency_id: [number, string] | false; item_ids: number[]; active: boolean }[]>(
    "product.pricelist", "search_read", { domain: [], fields: ["id", "name", "currency_id", "item_ids", "active"], order: "name asc" });
  const lists = rows.map((l) => ({ id: l.id, name: l.name, currency: l.currency_id ? l.currency_id[1] : "", rules: l.item_ids.length, active: l.active }));
  await ctx.store.set(K.odooLists, { at: new Date().toISOString(), lists });
  return ctx.t("admin.listsLoaded", { count: lists.length });
}
