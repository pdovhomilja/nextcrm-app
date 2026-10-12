import { sendOrder, sweepOrders } from "../orders-out";
import { syncOrderStatuses } from "../orders-status";
import { findOrCreateCustomer } from "../odoo-partners";
import { K, type OrderLink } from "../store";
import { account, mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);

it("I1: the order link exists as soon as the order is SENT, before the price check finishes", async () => {
  const compare = require("../compare");
  const hang = jest.spyOn(compare, "odooPrice").mockImplementation(() => new Promise(() => {}));
  const { ctx, client, data } = mkOrders();
  void sendOrder(ctx, client, "o1", now);
  for (let i = 0; i < 200 && data.orders[0].status !== "SENT"; i++) await new Promise((r) => setImmediate(r));
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  expect(data.orders[0].status).toBe("SENT");
  expect(await ctx.store.get(K.order("o1"))).toMatchObject({ odooId: expect.any(Number), priceDiffs: [] });
  expect(await ctx.store.get(K.send("o1"))).toBeNull();
  hang.mockRestore();
});

describe("I2: lookups normalize registration number and VAT like part 1", () => {
  const odooCo = (over: Record<string, unknown>) => ({ id: 50, name: "Other name", parent_id: false, active: true, type: "contact", country_id: [56, "CZ"], company_registry: false, vat: false, property_product_pricelist: [234, "x"], ...over });

  it("finds an unpadded registration number", async () => {
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCo({ company_registry: "1234567" })] } });
    expect(await findOrCreateCustomer(ctx, client, account({ company_id: "01234567", vat: null }), false, now)).toEqual({ partnerId: 50, created: false });
    expect(writes()).toEqual([]);
  });

  it("finds a VAT stored with a space", async () => {
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCo({ vat: "CZ 12345678" })] } });
    expect((await findOrCreateCustomer(ctx, client, account({ company_id: null, vat: "CZ12345678" }), false, now)).partnerId).toBe(50);
    expect(writes()).toEqual([]);
  });

  it("finds a VAT-only customer it created when Odoo reformatted the VAT", async () => {
    const acc = account({ company_id: null, vat: "CZ12345678" });
    const { ctx, client, sales } = mkOrders({ sales: { fail: { "res.partner/create": "after" }, vatFormat: (v) => `${v.slice(0, 2)} ${v.slice(2)}` } });
    await expect(findOrCreateCustomer(ctx, client, acc, false, now)).rejects.toMatchObject({ status: 500 });
    expect(await findOrCreateCustomer(ctx, client, acc, false, now)).toEqual({ partnerId: 1000, created: false });
    expect(sales.partners).toHaveLength(1);
  });
});

it("I3: two orders for one new account create one Odoo customer", async () => {
  const { ctx, client, sales } = mkOrders({ orders: [order(), order({ id: "o2", number: "ORD-2026-0002" })] });
  await Promise.all([sendOrder(ctx, client, "o1", now), sendOrder(ctx, client, "o2", now)]);
  await sendOrder(ctx, client, "o2", later(5));
  expect(sales.partners.filter((p) => p.type === "contact")).toHaveLength(1);
  expect(sales.orders).toHaveLength(2);
});

it("I4: an order waiting more than 24 hours notifies admins once", async () => {
  const { ctx, client, data } = mkOrders({ sales: { fail: { "res.partner/create": 500 } } });
  await sendOrder(ctx, client, "o1", now);
  await sendOrder(ctx, client, "o1", later(60));
  expect(ctx.notifications).toHaveLength(0);
  await sendOrder(ctx, client, "o1", later(25 * 60));
  await sendOrder(ctx, client, "o1", later(26 * 60));
  expect(ctx.notifications.map((n) => n.subject)).toEqual(["mail.stuckSubject"]);
  expect(data.orders[0].status).toBe("READY");
});

describe("I5: the sweep", () => {
  it("stops at the first order Odoo cannot be reached for", async () => {
    const { ctx, client, calls } = mkOrders({ orders: [order(), order({ id: "o2", number: "N2" }), order({ id: "o3", number: "N3" })], sales: { fail: { "res.partner/create": 503 } } });
    await sweepOrders(ctx, client, now);
    expect(calls.filter((c) => c.path === "/json/2/res.partner/create")).toHaveLength(1);
  });

  it("tries fresh orders before ones already waiting", async () => {
    const { ctx, client, sales } = mkOrders({ orders: [order({ id: "o1", number: "N1" }), order({ id: "o2", number: "N2", createdAt: "2026-10-13T07:30:00.000Z" })] });
    await ctx.store.set(K.send("o1"), { attempts: 0, lastError: "Odoo error 500", waitingSince: now.toISOString() });
    await sweepOrders(ctx, client, now);
    expect(sales.orders.map((o) => o.origin)).toEqual(["N2", "N1"]);
  });
});

it("I6: a sender holds its claim for 30 minutes", async () => {
  const { ctx, client } = mkOrders();
  const claim = jest.spyOn(ctx.store, "claim");
  await sendOrder(ctx, client, "o1", now);
  expect(claim.mock.calls.find((c) => c[0] === K.sending("o1"))![1]).toBeGreaterThanOrEqual(30 * 60_000);
});

it("I7: statuses come back from an Odoo without Inventory", async () => {
  const { ctx, client, data, calls } = mkOrders({
    orders: [order({ status: "SENT", externalRef: "900" })],
    sales: { orders: [{ id: 900, name: "S00900", state: "sale", invoice_status: "no", amount_total: 200, invoice_ids: [] } as never], saleFields: ["id", "name", "state", "invoice_status", "amount_total", "invoice_ids"] },
  });
  await ctx.store.set(K.order("o1"), { odooId: 900, name: "S00900", state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false, priceDiffs: [], deliveries: [], invoices: [], created: [], checkedAt: now.toISOString() } satisfies OrderLink);
  await syncOrderStatuses({ ctx, client, dry: false, now });
  expect(data.orders[0].status).toBe("CONFIRMED");
  const read = calls.find((c) => c.path === "/json/2/sale.order/search_read")!;
  expect(read.body.fields).not.toContain("picking_ids");
});
