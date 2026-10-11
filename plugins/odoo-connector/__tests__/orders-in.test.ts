import { sendOrder } from "../orders-out";
import { K, type OrderLink } from "../store";
import { importOrders, linkedCustomers, confirmedOrders, commercialOf } from "../orders-in";
import { mkOrders } from "./orders-helpers";
import { now } from "./helpers";

describe("shared order index", () => {
  it("a sent order is indexed by its Odoo id", async () => {
    const { ctx, client } = mkOrders({ sales: { partners: [{ id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", property_product_pricelist: [234, "Retail (CZK)"] }] } });
    await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
    await sendOrder(ctx, client, "o1", now);
    expect(await ctx.store.get(K.odooOrder(1000))).toEqual({ orderId: "o1" });
  });
});

const odooOrder = (over: Record<string, unknown> = {}) => ({
  id: 900, name: "S00900", state: "sale", partner_id: [50, "Bubble s.r.o."], origin: false, date_order: "2026-03-05 10:22:11",
  currency_id: [9, "CZK"], note: "<p>Leave at the gate</p>", write_date: "2026-03-05 10:30:00", amount_total: 242, amount_untaxed: 200,
  delivery_status: false, invoice_status: "no", invoice_ids: [], picking_ids: [], ...over,
});
const line = (over: Record<string, unknown> = {}) => ({ id: 1, order_id: [900, "S00900"], product_id: [700, "Scoop"], product_uom_qty: 2, price_unit: 100, display_type: false, is_downpayment: false, ...over });
const customer = { id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact" };

async function run(m: ReturnType<typeof mkOrders>, dry = false) {
  const linked = await linkedCustomers(m.ctx);
  const orders = await confirmedOrders(m.client, [...linked.keys()]);
  const commercial = await commercialOf(m.client, orders.map((o) => o.partner_id[0]));
  return importOrders({ ctx: m.ctx, client: m.client, dry, now, orders, commercial, linked });
}
const setup = (sales: Record<string, unknown> = {}, opts: Record<string, unknown> = {}) => {
  const m = mkOrders({ orders: [], sales: { partners: [customer], orders: [odooOrder()] as never[], lines: [line()] as never[], ...sales }, ...opts });
  void m.ctx.store.set(K.partner(50), { accountId: "a1" });
  return m;
};

describe("importing Odoo orders", () => {
  it("imports a confirmed order of a linked customer as an EXTERNAL order", async () => {
    const m = setup();
    expect(await run(m)).toBe(1);
    expect(m.data.orders).toHaveLength(1);
    expect(m.data.orders[0]).toMatchObject({ accountId: "a1", externalRef: "900", status: "CONFIRMED", currency: "CZK", orderDate: "2026-03-05", note: "Leave at the gate", lines: [{ productId: "p1", quantity: 2, unitPrice: 100 }] });
    const orderId = m.data.orders[0].id as string;
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId });
    expect(await m.ctx.store.get<OrderLink>(K.order(orderId))).toMatchObject({ odooId: 900, name: "S00900", state: "sale", imported: true, partnerId: 50, writeDate: "2026-03-05 10:30:00", total: 242 });
  });

  it("skips quotations, cancelled orders and customers that are not linked", async () => {
    const m = setup({ partners: [customer, { id: 60, name: "Other", parent_id: false, active: true }], orders: [odooOrder({ id: 901, state: "draft" }), odooOrder({ id: 902, state: "cancel" }), odooOrder({ id: 903, partner_id: [60, "Other"] })] });
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(0);
  });

  it("imports an order placed on a delivery contact into the customer's account", async () => {
    const m = setup({ partners: [customer, { id: 51, name: "Depot", parent_id: [50, "Bubble s.r.o."], active: true, type: "delivery" }], orders: [odooOrder({ partner_id: [51, "Depot"] })] });
    expect(await run(m)).toBe(1);
    expect(m.data.orders[0].accountId).toBe("a1");
  });

  it("keeps product lines only; notes, sections, down payments skipped, unknown products counted in the note", async () => {
    const m = setup({ lines: [line(), line({ id: 2, display_type: "line_note", product_id: false }), line({ id: 3, display_type: "line_section", product_id: false }), line({ id: 4, is_downpayment: true, product_id: [701, "Down payment"] }), line({ id: 5, product_id: [799, "Unknown"] })] });
    await run(m);
    expect(m.data.orders[0].lines).toEqual([{ productId: "p1", quantity: 2, unitPrice: 100 }]);
    expect(m.data.orders[0].note).toBe("Leave at the gate\norders.linesMissing");
  });

  it("turns Odoo's HTML note into plain text, and no note into null", async () => {
    const m = setup({ orders: [odooOrder({ note: "<p>A &amp; B<br>C</p>" }), odooOrder({ id: 901, note: false })], lines: [line(), line({ id: 2, order_id: [901, "S00901"] })] });
    await run(m);
    expect(m.data.orders.map((o) => o.note)).toEqual(["A & B\nC", null]);
  });

  it("imports an order with no line left, with the note", async () => {
    const m = setup({ lines: [line({ product_id: [799, "Unknown"] })] });
    expect(await run(m)).toBe(1);
    expect(m.data.orders[0]).toMatchObject({ lines: [], note: "Leave at the gate\norders.linesMissing" });
  });

  it("takes the status from Odoo's invoices", async () => {
    const m = setup({ orders: [odooOrder({ invoice_status: "invoiced", invoice_ids: [7] })], moves: [{ id: 7, name: "INV/7", move_type: "out_invoice", state: "posted", payment_state: "paid", invoice_date: "2026-03-06", invoice_date_due: "2026-03-20", amount_total: 242, amount_residual: 0 }] as never[] });
    await run(m);
    expect(m.data.orders[0].status).toBe("PAID");
    const link = await m.ctx.store.get<OrderLink>(K.order(m.data.orders[0].id as string));
    expect(link).toMatchObject({ done: true, invoices: [{ number: "INV/7", paymentState: "paid" }] });
  });

  it("never imports twice", async () => {
    const m = setup();
    await run(m);
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(1);
  });

  it("never imports an order the CRM sent, even when its link was lost", async () => {
    const m = setup({ orders: [odooOrder({ origin: "ORD-2026-0001" })] }, { orders: [{ id: "o1", number: "ORD-2026-0001", source: "CRM", status: "SENT", accountId: "a1" }] });
    expect(await run(m)).toBe(0);
    expect(m.data.orders).toHaveLength(1);
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId: "o1" });
  });

  it("indexes 3a links from before 0.4.0 and skips them", async () => {
    const m = setup();
    await m.ctx.store.set(K.order("o9"), { odooId: 900, name: "S00900" });
    expect(await run(m)).toBe(0);
    expect(await m.ctx.store.get(K.odooOrder(900))).toEqual({ orderId: "o9" });
  });

  it("imports at most 200 per run and the rest next run", async () => {
    const many = Array.from({ length: 205 }, (_, i) => odooOrder({ id: 1000 + i, name: `S${1000 + i}` }));
    const m = setup({ orders: many, lines: [] });
    expect(await run(m)).toBe(200);
    expect(await run(m)).toBe(5);
    expect(new Set(m.data.orders.map((o) => o.externalRef)).size).toBe(205);
  });

  it("a failing order is recorded, the others continue, and it is retried next run", async () => {
    const m = setup({ orders: [odooOrder(), odooOrder({ id: 901, name: "S00901" })], lines: [] });
    const create = m.ctx.data.orders.create.bind(m.ctx.data.orders);
    let fail = true;
    m.ctx.data.orders.create = async (d: any) => { if (fail && d.externalRef === "900") throw new Error("Currency not found: XYZ"); return create(d); };
    expect(await run(m)).toBe(1);
    expect(await m.ctx.store.get(K.importFailed(900))).toEqual({ name: "S00900", reason: "Currency not found: XYZ", at: now.toISOString() });
    fail = false;
    expect(await run(m)).toBe(1);
    expect(await m.ctx.store.get(K.importFailed(900))).toBeNull();
  });

  it("dry run skips orders the CRM sent, writes nothing", async () => {
    const m = setup({ orders: [odooOrder(), odooOrder({ id: 901, name: "S00901" })], lines: [] });
    await m.ctx.store.set(K.order("o9"), { odooId: 901, name: "S00901" });
    expect(await run(m, true)).toBe(0);
    expect(m.data.orders).toHaveLength(0);
    expect(await m.ctx.store.get(K.odooOrder(901))).toBeNull();
    expect(m.ctx.logs.filter((l) => l.message.startsWith("Dry run: would import"))).toHaveLength(1);
  });
});
