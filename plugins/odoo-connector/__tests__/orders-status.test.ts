import { syncOrderStatuses, targetStatus, type OdooMove, type OdooSale } from "../orders-status";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const sale = (over: Partial<OdooSale> = {}): OdooSale => ({ id: 900, name: "S00900", state: "sale", delivery_status: false, invoice_status: "no", amount_total: 242, invoice_ids: [], picking_ids: [], ...over });
const inv = (over: Partial<OdooMove> = {}): OdooMove => ({ id: 1, name: "INV/1", move_type: "out_invoice", state: "posted", payment_state: "not_paid", invoice_date: "2026-10-14", invoice_date_due: "2026-10-28", amount_total: 242, amount_residual: 242, ...over });
const link = (over: Partial<OrderLink> = {}): OrderLink => ({ odooId: 900, name: "S00900", state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false, priceDiffs: [], deliveries: [], invoices: [], created: [], checkedAt: now.toISOString(), ...over });

describe("status table (spec § 4.3)", () => {
  it.each([
    ["cancelled", sale({ state: "cancel" }), [], "CANCELLED"],
    ["draft", sale({ state: "draft" }), [], "SENT"],
    ["quotation sent", sale({ state: "sent" }), [], "SENT"],
    ["confirmed", sale(), [], "CONFIRMED"],
    ["locked", sale({ state: "done" }), [], "CONFIRMED"],
    ["partly shipped", sale({ delivery_status: "partial" }), [], "CONFIRMED"],
    ["shipped", sale({ delivery_status: "full" }), [], "DELIVERED"],
    ["invoiced before shipping", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv()], "INVOICED"],
    ["partly paid", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "partial" })], "INVOICED"],
    ["paid", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "paid" })], "PAID"],
    ["in payment", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "in_payment" })], "PAID"],
    ["reversed invoice ignored", sale({ invoice_status: "invoiced", invoice_ids: [1, 2] }), [inv({ payment_state: "reversed" }), inv({ id: 2, payment_state: "paid" })], "PAID"],
    ["paid partial invoice is not PAID", sale({ invoice_status: "to invoice", invoice_ids: [1] }), [inv({ payment_state: "paid" })], "CONFIRMED"],
  ] as const)("%s", (_n, s, moves, want) => expect(targetStatus(s as OdooSale, moves as unknown as OdooMove[])).toBe(want));
});

describe("reading back", () => {
  const setup = async (o: Record<string, unknown>, s: Partial<OdooSale> | null, moves: OdooMove[] = [], pickings: Record<string, unknown>[] = []) => {
    const m = mkOrders({ orders: [order({ status: "SENT", externalRef: "900", ...o })], sales: { orders: s ? [sale(s) as never] : [], moves: moves as never[], pickings } });
    await m.ctx.store.set(K.order("o1"), link());
    return m;
  };

  it("moves the order forward and refreshes the panel data", async () => {
    const { ctx, client, data } = await setup({}, { delivery_status: "full", picking_ids: [5], amount_total: 260 }, [], [{ id: 5, name: "WH/OUT/1", state: "done", date_done: "2026-10-15 09:00:00", picking_type_code: "outgoing" }]);
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 1, moved: 1 });
    expect(data.orders[0].status).toBe("DELIVERED");
    expect(await ctx.store.get(K.order("o1"))).toMatchObject({ state: "sale", total: 260, totalDiffers: true, deliveries: [{ name: "WH/OUT/1", state: "done", date: "2026-10-15 09:00:00" }] });
  });

  it("stores invoices with what is left to pay", async () => {
    const { ctx, client } = await setup({}, { invoice_status: "invoiced", invoice_ids: [1] }, [inv({ payment_state: "partial", amount_residual: 42 })]);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.invoices).toEqual([{ number: "INV/1", type: "out_invoice", date: "2026-10-14", due: "2026-10-28", amount: 242, residual: 42, paymentState: "partial" }]);
  });

  it("leaves a deleted Odoo order's CRM status alone (Review Focus 4, Pavel 2026-10-11)", async () => {
    const { ctx, client, data, calls } = await setup({}, null);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(data.orders[0].status).toBe("SENT");
    expect(calls.some((c) => c.path === "/json/2/sale.order/read")).toBe(false);
  });

  it("never moves backwards and logs it; a manual CRM move is kept", async () => {
    const { ctx, client, data } = await setup({ status: "DELIVERED" }, {});
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 1, moved: 0 });
    expect(data.orders[0].status).toBe("DELIVERED");
    expect(ctx.logs.some((l) => l.message.includes("went back"))).toBe(true);
  });

  it("does not read finished orders", async () => {
    const { ctx, client, calls } = await setup({ status: "PAID" }, {});
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 0, moved: 0 });
    expect(calls).toHaveLength(0);
  });

  it("writes nothing in dry run", async () => {
    const { ctx, client, data } = await setup({}, {});
    await syncOrderStatuses({ ctx, client, dry: true, now });
    expect(data.orders[0].status).toBe("SENT");
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.state).toBe("draft");
  });

  it("runs inside the sync and reports its counts", async () => {
    const { ctx, client } = await setup({}, {});
    const catalog = jest.spyOn(require("../catalog"), "syncCatalog").mockResolvedValue(undefined);
    const summary = await runSync(ctx, client, now);
    expect(summary.orders).toEqual({ checked: 1, moved: 1, imported: 0 });
    catalog.mockRestore();
  });
});
