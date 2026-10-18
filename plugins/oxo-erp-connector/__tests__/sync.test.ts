import { loadPriceLists, queueJob, runQueued } from "../jobs";
import { runSync, scheduledSync } from "../sync";
import { K, type RunSummary } from "../store";
import { customer, product } from "./fake-oxo";
import { mk, now } from "./helpers";

const takeoverData = () => ({
  accounts: [{ id: "a1", name: "Puffbox s.r.o.", company_id: "19737955", vat: null, assigned_to: "u-rep", deletedAt: null }],
  products: [{ id: "p537", source: "EXTERNAL", externalRef: "537", name: "[533002] K ČKS Jahoda", sku: "533002", tax_rate: 12, deletedAt: null }],
  productCategories: [{ id: "c1", source: "EXTERNAL", externalRef: "1", name: "Zásoby", parentRef: null }],
  priceLists: [{ id: "L242", source: "EXTERNAL", externalRef: "242", name: "Retail_STARTER", currency: "CZK", isActive: true }],
});
const takeoverOxo = () => ({
  customers: [customer(222, { odooId: 154, name: "Puffbox s.r.o.", ico: "19737955" }), customer(300, { name: "Nový bar" })],
  products: [product(537, { odooId: 537, code: "533002", name: "K ČKS Jahoda", category: "Zásoby" })],
  lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [] }],
});

describe("runSync", () => {
  it("takeover dry run then real run: the dry run writes nothing and reports links, not creations; the real run makes no duplicates", async () => {
    const { ctx, client, data } = mk(takeoverOxo(), takeoverData(), { dryRun: true, priceLists: "3" });
    const before = JSON.stringify(data);
    const dry = await runSync(ctx, client, now);
    expect(JSON.stringify(data)).toBe(before);
    expect([dry.ok, dry.dryRun, dry.customers.number, dry.customers.created, dry.catalog?.productsUpdated, dry.catalog?.productsCreated, dry.catalog?.listsReplaced]).toEqual([true, true, 1, 1, 1, 0, 1]);
    expect(dry.rows.created).toEqual([{ customerId: 300, name: "Nový bar" }]);
    expect(await ctx.store.get(K.report)).toEqual(dry);
    expect((await ctx.store.list("")).map((e) => e.key).sort()).toEqual([K.failures, K.lastRun, K.report].sort());

    ctx.settings.dryRun = false;
    const real = await runSync(ctx, client, now);
    expect(real.ok).toBe(true);
    expect([data.accounts.length, data.products.length, data.priceLists.length]).toEqual([2, 1, 1]);
    expect(data.products[0]).toMatchObject({ id: "p537", tax_rate: "12" });
    expect(data.priceLists[0]).toMatchObject({ id: "L242", isActive: true });
    expect(await ctx.store.get(K.cursor("customers"))).toEqual({ at: "2026-10-18T08:00:00.000Z" });
  });

  it("a second run while one is in progress is skipped", async () => {
    const { ctx, client } = mk();
    await ctx.store.set(K.lock, { until: new Date(Date.now() + 60_000).toISOString() });   // claim compares with the clock
    const s = await runSync(ctx, client, now);
    expect([s.ok, s.error]).toEqual([false, "admin.running"]);
  });

  it("a rejected key stops the run, keeps the cursors, and the third failure in a row emails admins", async () => {
    const { ctx, client } = mk();
    ctx.http.fetch = async () => new Response(JSON.stringify({ error: "unauthorized", message: "Chybí nebo neplatí API klíč." }), { status: 401 });
    for (let i = 0; i < 3; i++) await runSync(ctx, client, now);
    const last = await ctx.store.get<RunSummary>(K.lastRun);
    expect([last?.ok, last?.error]).toEqual([false, "OXO ERP error 401: Chybí nebo neplatí API klíč."]);
    expect(await ctx.store.get(K.cursor("customers"))).toBeNull();
    expect(ctx.notifications.map((n) => n.subject)).toEqual(["mail.failingSubject"]);
    expect(await ctx.store.get(K.lock)).toBeNull();
  });
});

describe("schedule and jobs", () => {
  it("runs when syncMinutes have passed; never on schedule in dry run", async () => {
    const { ctx, client } = mk();
    expect(await scheduledSync(ctx, now, client)).toBe(true);
    expect(await scheduledSync(ctx, new Date(now.getTime() + 5 * 60_000), client)).toBe(false);
    expect(await scheduledSync(ctx, new Date(now.getTime() + 15 * 60_000), client)).toBe(true);
    ctx.settings.dryRun = true;
    expect(await scheduledSync(ctx, new Date(now.getTime() + 60 * 60_000), client)).toBe(false);
  });

  it("Sync now queues a job the cron runs once, in dry run too", async () => {
    const { ctx, client } = mk({}, {}, { dryRun: true });
    expect(await queueJob(ctx, now)).toBe("admin.queued");
    await runQueued(ctx, now, client);
    expect([(await ctx.store.get<RunSummary>(K.lastRun))?.dryRun, await ctx.store.get(K.job)]).toEqual([true, null]);
  });

  it("loads OXO ERP's price lists for the admin section", async () => {
    const { ctx, client } = mk({ lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [] }] });
    expect(await loadPriceLists(ctx, client)).toBe("admin.listsLoaded");
    expect((await ctx.store.get<{ lists: unknown[] }>(K.oxoLists))?.lists).toEqual([{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: 0 }]);
  });
});
