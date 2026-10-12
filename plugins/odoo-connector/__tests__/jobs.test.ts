import { K } from "../store";
import { loadPriceLists, queueJob, runQueued } from "../jobs";
import { company, mk, now } from "./helpers";

it("queues Sync now and runs it on the next cron tick, then clears the job", async () => {
  const accounts: Record<string, unknown>[] = [];
  const { ctx, client } = mk([company(1)], accounts);
  expect(await queueJob(ctx, "sync", now)).toBe("admin.queued");
  expect(accounts).toHaveLength(0);
  await runQueued(ctx, now, client);
  expect(accounts).toHaveLength(1);
  expect(await ctx.store.get(K.job("sync"))).toBeNull();
});

it("runs a queued sync before a queued compare, never both at once (Review Focus 4)", async () => {
  const { ctx, client } = mk([company(1)]);
  const order: string[] = [];
  jest.spyOn(require("../sync"), "runSync").mockImplementation(async () => { order.push(`sync:${!!(await ctx.store.get(K.lock))}`); return { ok: true } as never; });
  jest.spyOn(require("../compare"), "runCompare").mockImplementation(async () => { order.push("compare"); });
  await queueJob(ctx, "compare", now);
  await queueJob(ctx, "sync", now);
  await runQueued(ctx, now, client);
  expect(order).toEqual(["sync:false", "compare"]);
  jest.restoreAllMocks();
});

it("skips queued jobs while another run holds the lock", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + 60_000).toISOString() });
  await queueJob(ctx, "sync", now);
  await runQueued(ctx, now, client);
  expect(await ctx.store.get(K.job("sync"))).not.toBeNull();
});

it("loads Odoo price lists for the admin section", async () => {
  const { ctx, client } = mk([], [], {}, undefined, {
    "product.pricelist/search_read": () => [{ id: 245, name: "Gold CZK", currency_id: [9, "CZK"], item_ids: [1, 2], active: true }],
  });
  expect(await loadPriceLists(ctx, client)).toBe("admin.listsLoaded");
  expect(await ctx.store.get(K.odooLists)).toMatchObject({ lists: [{ id: 245, name: "Gold CZK", currency: "CZK", rules: 2, active: true }] });
});
