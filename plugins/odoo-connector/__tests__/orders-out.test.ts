import { sendOrder } from "../orders-out";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const linked = async (ctx: any) => ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null, odooPriceList: [234, "Retail (CZK)"] });
const customer = { id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", property_product_pricelist: [234, "Retail (CZK)"] };

describe("sending", () => {
  it("creates one draft sale order and marks the CRM order SENT", async () => {
    const { ctx, client, sales, data, calls } = mkOrders({ sales: { partners: [customer] }, orders: [order({ note: "Ring twice", requestedDeliveryDate: "2026-10-20T00:00:00.000Z" })] });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    const create = calls.find((c) => c.path === "/json/2/sale.order/create")!;
    expect(create.body.vals_list[0]).toEqual({
      partner_id: 50, partner_shipping_id: 50, pricelist_id: 234, origin: "ORD-2026-0001", user_id: 9, commitment_date: "2026-10-20 00:00:00",
      note: "Rep One\nRing twice", order_line: [[0, 0, { product_id: 700, product_uom_qty: 2, price_unit: 100 }]],
    });
    expect(sales.orders).toHaveLength(1);
    expect(data.orders[0]).toMatchObject({ status: "SENT", externalRef: "1000" });
    expect(await ctx.store.get(K.order("o1"))).toMatchObject({ odooId: 1000, name: "S01000", state: "draft", sentAt: now.toISOString(), priceDiffs: [], created: [] });
  });

  it("falls back to the customer's Odoo salesperson when the owner has no Odoo user", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [{ ...customer, user_id: [12, "Key Account"] }], users: [] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(calls.find((c) => c.path === "/json/2/sale.order/create")!.body.vals_list[0].user_id).toBe(12);
  });

  it("uses the order's price list when it was imported from Odoo", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [customer] }, orders: [order({ priceListId: "L245" })] });
    await linked(ctx);
    await ctx.store.set(K.pricelist(245), { priceListId: "L245", name: "Gold", ruleCount: 1, syncedAt: "x", isActive: true });
    await sendOrder(ctx, client, "o1", now);
    expect(calls.find((c) => c.path === "/json/2/sale.order/create")!.body.vals_list[0].pricelist_id).toBe(245);
  });

  it("creates the customer and a delivery address and records both", async () => {
    const { ctx, client, sales } = mkOrders({ orders: [order({ shipping_street: "Depot 5", shipping_city: "Brno", shipping_postal_code: "60200" })] });
    await sendOrder(ctx, client, "o1", now);
    expect(sales.partners.map((p) => p.type)).toEqual(["contact", "delivery"]);
    expect((await ctx.store.get<any>(K.order("o1"))).created).toEqual(["customer", "delivery"]);
    expect((await ctx.store.get<any[]>(K.created))!.map((c) => [c.kind, c.orderNumber])).toEqual([["delivery", "ORD-2026-0001"], ["customer", "ORD-2026-0001"]]);
  });

  it("finds an existing Odoo order by origin instead of creating a second one", async () => {
    const existing = { id: 900, name: "S00900", origin: "ORD-2026-0001", state: "draft" };
    const line = { id: 901, order_id: [900, "S00900"], display_type: false, product_id: [700, "x"], product_uom_qty: 2, price_unit: 100 };
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer], orders: [existing], lines: [line] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0]).toMatchObject({ status: "SENT", externalRef: "900" });
  });

  it("refuses when Odoo has the number with other lines (Review Focus 3)", async () => {
    const existing = { id: 900, name: "S00900", origin: "ORD-2026-0001", state: "draft" };
    const line = { id: 901, order_id: [900, "S00900"], display_type: false, product_id: [700, "x"], product_uom_qty: 5, price_unit: 100 };
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer], orders: [existing], lines: [line] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(await ctx.store.get(K.failed("o1"))).toEqual({ reason: "orders.otherLines", at: now.toISOString() });
  });

  it("ignores cancelled Odoo orders with the same origin", async () => {
    const { ctx, client, sales } = mkOrders({ sales: { partners: [customer], orders: [{ id: 900, name: "S00900", origin: "ORD-2026-0001", state: "cancel" }] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(sales.orders).toHaveLength(2);
  });

  it("fails at once, without Odoo writes, on a product that does not come from Odoo", async () => {
    const { ctx, client, data, writes } = mkOrders({ products: [{ id: "p1", source: "CRM", externalRef: null, sku: "X1", name: "Own", status: "ACTIVE" }] });
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(ctx.notifications).toHaveLength(1);
  });

  it("fails at once when the order currency differs from the Odoo price list", async () => {
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer] }, orders: [order({ currency: "EUR" })] });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
  });

  it("flags lines whose Odoo price differs by more than 1, not by 1", async () => {
    const a = mkOrders({ sales: { partners: [customer], price: 101.5 } });
    await linked(a.ctx);
    await sendOrder(a.ctx, a.client, "o1", now);
    expect((await a.ctx.store.get<any>(K.order("o1"))).priceDiffs).toEqual([{ sku: "800009", crm: 100, odoo: 101.5 }]);
    const b = mkOrders({ sales: { partners: [customer], price: 101 } });
    await linked(b.ctx);
    await sendOrder(b.ctx, b.client, "o1", now);
    expect((await b.ctx.store.get<any>(K.order("o1"))).priceDiffs).toEqual([]);
  });

  it("still sends when Odoo cannot price the lines", async () => {
    const { ctx, client, data } = mkOrders({ sales: { partners: [customer], price: null } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(data.orders[0].status).toBe("SENT");
    expect(ctx.logs.some((l) => l.level === "warn" && l.message.includes("Price check"))).toBe(true);
  });

  it("writes nothing with sendOrders off, in dry run, or for an order that is not READY", async () => {
    for (const [settings, o] of [[{ sendOrders: false }, order()], [{ dryRun: true }, order()], [{}, order({ status: "DRAFT" })], [{}, order({ externalRef: "5" })]] as const) {
      const { ctx, client, calls, data } = mkOrders({ settings, orders: [o], sales: { partners: [customer] } });
      await linked(ctx);
      await sendOrder(ctx, client, "o1", now);
      expect(calls).toHaveLength(0);
      expect(data.orders[0].status).toBe(o.status);
    }
  });
});
