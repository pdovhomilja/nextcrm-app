import { oxoClient, type OxoClient, type OxoPriceList } from "./oxo";
import type { Ctx } from "./settings";
import { K } from "./store";
import { runSync } from "./sync";

export async function queueJob(ctx: Ctx, now: Date): Promise<string> {
  await ctx.store.set(K.job, { requestedAt: now.toISOString() });
  return ctx.t("admin.queued");
}

/** A queued "Sync now" runs on the cron (admin actions must return quickly). */
export async function runQueued(ctx: Ctx, now: Date, client: OxoClient = oxoClient(ctx)): Promise<void> {
  if (!(await ctx.store.get(K.job))) return;
  try { await runSync(ctx, client, now); } finally { await ctx.store.delete(K.job); }
}

/** Admin action: OXO ERP's active price lists and their ids, for the priceLists setting. */
export async function loadPriceLists(ctx: Ctx, client: OxoClient = oxoClient(ctx)): Promise<string> {
  const { items } = await client.get<{ items: OxoPriceList[] }>("/price-lists");
  const lists = items.map((l) => ({ id: l.id, odooId: l.odooId, name: l.name, currency: l.currency, rules: l.rules.length }));
  await ctx.store.set(K.oxoLists, { at: new Date().toISOString(), lists });
  return ctx.t("admin.listsLoaded", { count: lists.length });
}
