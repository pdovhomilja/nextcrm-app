import { localDay } from "../settings";
import { accountTabData } from "../ui/data";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

it("is null for an account that is not linked", async () => {
  expect(await accountTabData(mkOrders().ctx, "a1", now)).toBeNull();
});

it("localDay is the calendar day in the instance zone", () => {
  expect(localDay(mkOrders({ settings: { timeZone: "Europe/Prague" } }).ctx, new Date("2026-10-12T22:30:00Z"))).toBe("2026-10-13");
});

it("lists the account's Odoo orders newest first, open invoices with overdue days and what is owed, totals", async () => {
  const { ctx } = mkOrders({ orders: [
    order({ id: "o1", number: "N1", status: "PAID", orderDate: "2026-03-05", subtotal: "200.00", currency: "CZK" }),
    order({ id: "o2", number: "N2", status: "CONFIRMED", orderDate: "2026-09-01", subtotal: "50.00", currency: "CZK" }),
    order({ id: "o3", number: "N3", status: "DRAFT", orderDate: "2026-10-01", subtotal: "9.00", currency: "CZK" }),
  ] });
  await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
  await ctx.store.set(K.order("o1"), { odooId: 900, name: "S00900", imported: true });
  await ctx.store.set(K.order("o2"), { odooId: 901, name: "S00901" });
  await ctx.store.set(K.customer("a1"), { at: "2026-10-13T07:45:00.000Z", totals: [{ year: 2026, currency: "CZK", amount: 250 }], invoices: [
    { number: "INV/1", type: "out_invoice", date: "2026-09-01", due: "2026-10-03", currency: "CZK", amount: 1210, residual: 1210 },
    { number: "RINV/2", type: "out_refund", date: "2026-09-02", due: null, currency: "CZK", amount: 100, residual: 100 },
  ] });
  const d = await accountTabData(ctx, "a1", now);
  expect(d).toMatchObject({
    partnerId: 50, url: "https://odoo.example.com/odoo/contacts/50", at: "2026-10-13T07:45:00.000Z",
    orders: [
      { orderId: "o2", number: "N2", odooName: "S00901", date: "2026-09-01", total: 50, currency: "CZK", status: "CONFIRMED", imported: false },
      { orderId: "o1", number: "N1", odooName: "S00900", date: "2026-03-05", total: 200, currency: "CZK", status: "PAID", imported: true },
    ],
    invoices: [{ number: "INV/1", overdueDays: 10, sign: 1 }, { number: "RINV/2", overdueDays: 0, sign: -1 }],
    owed: [{ currency: "CZK", amount: 1110 }],
    totals: [{ year: 2026, currency: "CZK", amount: 250 }],
  });
});

it("shows at most 50 orders", async () => {
  const orders = Array.from({ length: 55 }, (_, i) => order({ id: `o${i}`, number: `N${i}`, orderDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }));
  const { ctx } = mkOrders({ orders });
  await ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null });
  for (const o of orders) await ctx.store.set(K.order(o.id as string), { odooId: 1, name: "S" });
  expect((await accountTabData(ctx, "a1", now))!.orders).toHaveLength(50);
});
