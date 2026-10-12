import { syncCustomerInfo } from "../customer-info";
import { K, type CustomerInfo } from "../store";
import type { OdooOrderIn } from "../orders-in";
import { mkOrders } from "./orders-helpers";
import { now } from "./helpers";

const inv = (over: Record<string, unknown> = {}) => ({ id: 1, name: "INV/1", move_type: "out_invoice", state: "posted", payment_state: "not_paid", commercial_partner_id: [50, "Bubble"], invoice_date: "2026-09-01", invoice_date_due: "2026-09-15", currency_id: [9, "CZK"], amount_total: 1210, amount_residual: 1210, ...over });
const ord = (over: Record<string, unknown> = {}) => ({ id: 1, partner_id: [50, "Bubble"], date_order: "2026-03-05 10:00:00", currency_id: [9, "CZK"], amount_untaxed: 100, ...over }) as unknown as OdooOrderIn;

function setup(moves: Record<string, unknown>[]) {
  const m = mkOrders({ sales: { moves: moves as never[] } });
  return m;
}

it("stores open invoices and credit notes and this and last year's totals per linked account", async () => {
  const m = setup([inv(), inv({ id: 2, name: "RINV/2", move_type: "out_refund", amount_total: 100, amount_residual: 100 }), inv({ id: 3, payment_state: "paid" }), inv({ id: 4, commercial_partner_id: [60, "Other"] })]);
  const linked = new Map([[50, "a1"], [70, "a2"]]);
  const orders = [ord(), ord({ id: 2, amount_untaxed: 50.5 }), ord({ id: 3, date_order: "2025-12-31 23:00:00" }), ord({ id: 4, date_order: "2024-06-01 00:00:00" }), ord({ id: 5, partner_id: [51, "Depot"], currency_id: [125, "EUR"], amount_untaxed: 10 })];
  await syncCustomerInfo({ ctx: m.ctx, client: m.client, dry: false, now, linked, orders, commercial: new Map([[51, 50]]) });
  expect(await m.ctx.store.get<CustomerInfo>(K.customer("a1"))).toEqual({
    at: now.toISOString(),
    invoices: [
      { number: "INV/1", type: "out_invoice", date: "2026-09-01", due: "2026-09-15", currency: "CZK", amount: 1210, residual: 1210 },
      { number: "RINV/2", type: "out_refund", date: "2026-09-01", due: "2026-09-15", currency: "CZK", amount: 100, residual: 100 },
    ],
    totals: [{ year: 2026, currency: "CZK", amount: 150.5 }, { year: 2026, currency: "EUR", amount: 10 }, { year: 2025, currency: "CZK", amount: 100 }],
  });
  expect(await m.ctx.store.get(K.customer("a2"))).toEqual({ at: now.toISOString(), invoices: [], totals: [] });
});

it("writes nothing in dry run", async () => {
  const m = setup([inv()]);
  await syncCustomerInfo({ ctx: m.ctx, client: m.client, dry: true, now, linked: new Map([[50, "a1"]]), orders: [], commercial: new Map() });
  expect(await m.ctx.store.get(K.customer("a1"))).toBeNull();
});
