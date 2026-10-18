import type { RecordData } from "@nextcrm/plugin-sdk";
import { syncCatalog } from "../catalog";
import { syncOrdersIn } from "../orders-in";
import { sendOrder, sweepOrders } from "../orders-out";
import { syncOrderStatuses } from "../orders-status";
import { runSync } from "../sync";
import { ordersData } from "../ui/data";
import { K } from "../store";
import { customer, order, product } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

/** Core caps find() at 100 rows (lib/plugins/data-api.ts MAX_TAKE); the test context does not. */
function capFind(ctx: TestCtx) {
  const find = ctx.data.orders.find;
  ctx.data.orders.find = (a = {}) => find({ ...a, take: Math.min(a.take ?? 100, 100) });
}
const many = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i + 1));

describe("review fixes", () => {
  it("C1: the status sweep reaches every open order, not only the first 100", async () => {
    const { ctx, client, data } = mk({ orders: many(150, (i) => order(i, { delivery: "full" })) },
      { orders: many(150, (i) => ({ id: `o${i}`, number: `ORD-${i}`, status: "SENT", externalRef: `oxo:${i}`, source: "CRM", createdAt: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}` })) });
    capFind(ctx);
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 150, moved: 150 });
    expect(data.orders.every((o) => o.status === "DELIVERED")).toBe(true);
  });

  it("C1: the send sweep and the waiting count see every READY order", async () => {
    const { ctx, client } = mk({}, { accounts: [{ id: "a1", name: "A", deletedAt: null }],
      orders: many(150, (i) => ({ id: `o${i}`, number: `ORD-${i}`, status: "READY", externalRef: null, accountId: "a1", currency: "CZK", lines: [{ productId: "pX", quantity: "1", unitPrice: "1" }], createdAt: `2026-10-01T00:00:${String(i % 60).padStart(2, "0")}Z` })) }, { sendOrders: true });
    capFind(ctx);
    expect((await ordersData(ctx, now)).waiting).toBe(150);
    expect(await sweepOrders(ctx, client, now)).toBe(150);
  });

  it("I1: one order that cannot be written does not block the others and is retried", async () => {
    const t = mk({ orders: [order(70, { updatedAt: "2026-10-18T08:00:00.000Z" }), order(71, { updatedAt: "2026-10-18T08:05:00.000Z" })] });
    await t.ctx.store.set(K.customer(1), { accountId: "a1" });
    const create = t.ctx.data.orders.create;
    let first = true;
    t.ctx.data.orders.create = async (d) => { if (first) { first = false; throw new Error("Account not found"); } return create(d); };
    let out = await syncOrdersIn({ ctx: t.ctx, client: t.client, dry: false, now });
    expect([out.imported, out.top, t.data.orders.map((o) => o.externalRef)]).toEqual([1, "2026-10-18T08:05:00.000Z", ["oxo:71"]]);
    expect(await t.ctx.store.get(K.pending(70))).not.toBeNull();
    await t.ctx.store.set(K.cursor("orders"), { at: "2026-10-19T00:00:00.000Z" });
    out = await syncOrdersIn({ ctx: t.ctx, client: t.client, dry: false, now });
    expect([out.imported, await t.ctx.store.get(K.pending(70))]).toEqual([1, null]);
  });

  it("I2: a CRM product adopted by SKU keeps its tax rate, cost and description", async () => {
    const { ctx, client, data } = mk({ products: [product(5, { code: "X1", name: "Native" })] },
      { products: [{ id: "crm1", source: "CRM", sku: "X1", name: "Hand made", tax_rate: 21, unit_cost: 5, description: "Ručně", deletedAt: null }] });
    await syncCatalog({ ctx, client, dry: false, now });
    expect(data.products).toHaveLength(1);
    expect(data.products[0]).toMatchObject({ id: "crm1", source: "EXTERNAL", name: "Native", tax_rate: "21", unit_cost: "5", description: "Ručně" });
  });

  it("I3: the run takes the lock atomically and keeps it during a long import", async () => {
    const { ctx, client } = mk({ customers: many(250, (i) => customer(i)) });
    await ctx.store.set(K.lock, { until: new Date(Date.now() + 60_000).toISOString() });
    expect((await runSync(ctx, client, now)).error).toBe("admin.running");
    await ctx.store.delete(K.lock);
    const claim = jest.spyOn(ctx.store, "claim");
    const set = jest.spyOn(ctx.store, "set");
    expect((await runSync(ctx, client, now)).ok).toBe(true);
    expect(claim.mock.calls.filter(([k]) => k === K.lock)).toHaveLength(1);
    expect(set.mock.calls.filter(([k]) => k === K.lock).length).toBeGreaterThanOrEqual(2);
  });

  it("M1: lines go out in the order's position order, so a repeat matches and below-list names the right line", async () => {
    const t = mk({ post: (b) => ({ status: 201, body: order(9, { lines: b.lines.map((l: { productId: number }, i: number) => ({ id: i, productId: l.productId, quantity: "1", deliveredQty: "0", unitPrice: "1", discount: "0", listPrice: "2", belowList: l.productId === 12 })) }) }) },
      { accounts: [{ id: "a1", name: "A", deletedAt: null }], orders: [{ id: "o1", number: "ORD-1", status: "READY", externalRef: null, accountId: "a1", currency: "CZK",
        lines: [{ position: 2, productId: "p12", sku: "SECOND", quantity: "1", unitPrice: "1" }, { position: 1, productId: "p11", sku: "FIRST", quantity: "1", unitPrice: "1" }] }] }, { sendOrders: true });
    await t.ctx.store.set(K.product("p11"), { oxoId: 11, ref: "oxo:11", templateId: null, categoryRef: null });
    await t.ctx.store.set(K.product("p12"), { oxoId: 12, ref: "oxo:12", templateId: null, categoryRef: null });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("sent");
    expect(t.oxo.calls.find((c) => c.method === "POST")?.body.lines.map((l: { productId: number }) => l.productId)).toEqual([11, 12]);
    expect((await t.ctx.store.get<{ belowList: string[] }>(K.order("o1")))?.belowList).toEqual(["SECOND"]);
  });
});
