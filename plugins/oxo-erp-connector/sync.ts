import { syncCatalog } from "./catalog";
import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "./customers";
import { syncOrdersIn } from "./orders-in";
import { syncOrderStatuses } from "./orders-status";
import { isAuthError, oxoClient, type OxoClient } from "./oxo";
import { msg, tell, type Ctx } from "./settings";
import { K, LOCK_MS, type CatalogCounts, type OrderCounts, type RunSummary } from "./store";

const SLACK_MS = 30_000;

export const zeroOrders = (): OrderCounts => ({ checked: 0, moved: 0, imported: 0, updated: 0, pending: 0 });

export function summaryText(ctx: Ctx, s: RunSummary): string {
  if (!s.ok) return ctx.t("admin.failed", { error: s.error ?? "?" });
  const parts = [ctx.t("admin.customerCounts", { ...s.customers })];
  if (s.catalog) parts.push(ctx.t("admin.catalogCounts", { ...s.catalog, listsMissing: s.catalog.listsMissing.join(", ") }));
  if (s.orders) parts.push(ctx.t("admin.orderCounts", { ...s.orders }));
  return parts.join(" · ");
}

/**
 * One sync: customers, catalog, order statuses, orders in. Cursors move only after a successful non-dry run;
 * a dry run's summary is also kept as the takeover report (spec § 4.4).
 */
export async function runSync(ctx: Ctx, client: OxoClient, now: Date): Promise<RunSummary> {
  const dry = ctx.settings.dryRun;
  const base = { at: now.toISOString(), dryRun: dry };
  // Atomic: two crons can never both start a run (a second run would create the same new accounts twice).
  if (!(await ctx.store.claim(K.lock, LOCK_MS))) {
    ctx.log.info("Sync skipped: another run is in progress");
    return { ...base, ok: false, error: ctx.t("admin.running"), customers: zeroCustomers(), rows: emptyRows() };
  }
  const r: CustomerRun = { ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() };
  let catalog: CatalogCounts | undefined;
  const orders = zeroOrders();
  let summary: RunSummary;
  try {
    const customersTop = await syncCustomers(r, client);
    const cat = await syncCatalog({ ctx, client, dry, now });
    catalog = cat.counts;
    let ordersTop: string | null = null;
    try {
      Object.assign(orders, await syncOrderStatuses({ ctx, client, dry, now }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      ctx.log.error(`Order statuses failed: ${msg(e)}`);
    }
    try {
      const inn = await syncOrdersIn({ ctx, client, dry, now });
      Object.assign(orders, { imported: inn.imported, updated: inn.updated, pending: inn.pending });
      ordersTop = inn.top;
    } catch (e) {
      if (isAuthError(e)) throw e;
      ctx.log.error(`Orders from OXO ERP failed: ${msg(e)}`);
    }
    if (!dry) {
      if (customersTop) await ctx.store.set(K.cursor("customers"), { at: customersTop });
      if (cat.top) await ctx.store.set(K.cursor("products"), { at: cat.top });
      if (ordersTop) await ctx.store.set(K.cursor("orders"), { at: ordersTop });
    }
    summary = { ...base, ok: true, customers: r.counts, catalog, orders, rows: r.rows };
    await ctx.store.set(K.failures, { count: 0 });
    ctx.log.info(`Sync finished${dry ? " (dry run)" : ""}`, { ...r.counts });
  } catch (e) {
    const error = msg(e);
    summary = { ...base, ok: false, error, customers: r.counts, catalog, orders, rows: r.rows };
    ctx.log.error(`Sync failed: ${error}`);
    const failures = ((await ctx.store.get<{ count: number }>(K.failures))?.count ?? 0) + 1;
    await ctx.store.set(K.failures, { count: failures });
    if (failures === 3) await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.failingSubject"), text: ctx.t("mail.failingText", { error }) });
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.lastRun, summary);
  if (dry) await ctx.store.set(K.report, summary);
  return summary;
}

/** The cron runs every 5 minutes; a sync starts when syncMinutes have passed. In dry run the schedule is paused; "Sync now" still runs. */
export async function scheduledSync(ctx: Ctx, now: Date, client: OxoClient = oxoClient(ctx)): Promise<boolean> {
  if (ctx.settings.dryRun) return false;
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) < ctx.settings.syncMinutes * 60_000 - SLACK_MS) return false;
  await runSync(ctx, client, now);
  return true;
}
