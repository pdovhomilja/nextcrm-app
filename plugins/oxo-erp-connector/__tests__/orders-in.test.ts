import { syncOrdersIn } from "../orders-in";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { customer, order } from "./fake-oxo";
import { mk, now } from "./helpers";

const line = (id: number, productId: number, over = {}) => ({ id, productId, quantity: "6", deliveredQty: "0", unitPrice: "100", discount: "10", listPrice: "100", belowList: false, ...over });

async function setup(orders: ReturnType<typeof order>[], data: Record<string, any[]> = {}) {
  const t = mk({ orders }, data);
  await t.ctx.store.set(K.customer(1), { accountId: "a1" });
  await t.ctx.store.set(K.product("p11"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  return t;
}

describe("orders in", () => {
  it("imports an OXO ERP order as EXTERNAL with the charged price; lines of unknown products are counted in the note", async () => {
    const { ctx, client, data } = await setup([order(70, { note: "Telefonicky", delivery: "full", lines: [line(1, 11), line(2, 99)] })]);
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.top]).toEqual([1, "2026-10-18T08:00:00.000Z"]);
    expect(data.orders[0]).toMatchObject({ accountId: "a1", externalRef: "oxo:70", status: "DELIVERED", currency: "CZK", orderDate: "2026-10-17", note: "Telefonicky\norders.linesMissing",
      lines: [{ productId: "p11", quantity: "6", unitPrice: "90" }] });
    expect(await ctx.store.get<OrderLink>(K.order(data.orders[0].id as string))).toMatchObject({ oxoId: 70, imported: true, missing: 1 });
  });

  it("updates an order odoo-connector imported (same Odoo id) instead of creating a second one", async () => {
    const { ctx, client, data } = await setup([order(40, { odooId: 176, lines: [line(1, 11, { discount: "0" })] })],
      { orders: [{ id: "x1", source: "EXTERNAL", externalRef: "176", status: "CONFIRMED", lines: [] }] });
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.updated, data.orders.length]).toEqual([0, 1, 1]);
    expect(data.orders[0].lines).toEqual([{ productId: "p11", quantity: "6", unitPrice: "100" }]);
  });

  it("skips CRM orders: ones it sent (crmNumber) and ones sent to Odoo before the switch", async () => {
    const { ctx, client, data } = await setup([order(1, { crmNumber: "ORD-1" }), order(2, { odooId: 300 })], { orders: [{ id: "c1", source: "CRM", externalRef: "300", status: "SENT" }] });
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.updated, data.orders.length]).toEqual([0, 0, 1]);
  });

  it("pending order: waits for its customer and is imported once linked, without an OXO ERP change", async () => {
    const { ctx, client, data } = await setup([order(80, { customerId: 2, lines: [line(1, 11)] })]);
    let out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.pending, data.orders.length]).toEqual([1, 0]);
    await ctx.store.set(K.customer(2), { accountId: "a2" });
    await ctx.store.set(K.cursor("orders"), { at: "2026-10-19T00:00:00.000Z" });
    out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, data.orders[0]?.accountId, await ctx.store.get(K.pending(80))]).toEqual([1, "a2", null]);
  });

  it("an unchanged order is not written again; dry run writes nothing", async () => {
    const { ctx, client, data } = await setup([order(70, { lines: [line(1, 11)] })]);
    const dry = await syncOrdersIn({ ctx, client, dry: true, now });
    expect([dry.imported, data.orders.length]).toEqual([1, 0]);
    await syncOrdersIn({ ctx, client, dry: false, now });
    const again = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([again.imported, again.updated]).toEqual([0, 0]);
  });

  it("runs inside the sync after the customers, moves the orders cursor", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1)], orders: [order(70, { lines: [] })] });
    const s = await runSync(ctx, client, now);
    expect([s.orders?.imported, data.orders.length, await ctx.store.get(K.cursor("orders"))]).toEqual([1, 1, { at: "2026-10-18T08:00:00.000Z" }]);
  });
});
