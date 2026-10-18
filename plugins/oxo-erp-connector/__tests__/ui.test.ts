import { accountTabData, catalogData, needsOwner, orderPanelData, ordersData, panelData, productPanelData } from "../ui/data";
import { K } from "../store";
import { mk, now } from "./helpers";

const T = "2026-10-18T08:00:00.000Z";

it("lists linked accounts without an owner", async () => {
  const { ctx } = mk({}, { accounts: [{ id: "a1", name: "No owner", assigned_to: null, deletedAt: null }, { id: "a2", name: "Owned", assigned_to: "u1", deletedAt: null }] });
  for (const id of ["a1", "a2"]) await ctx.store.set(K.account(id), { customerId: 1, syncedAt: T, priceListId: null, addresses: [] });
  expect(await needsOwner(ctx)).toEqual([{ accountId: "a1", name: "No owner" }]);
});

it("account panel: customer id, price list, active addresses, inactive flag", async () => {
  const { ctx } = mk();
  expect(await panelData(ctx, "a1")).toBeNull();
  await ctx.store.set(K.account("a1"), { customerId: 222, syncedAt: T, priceListId: 3, inactive: true, addresses: [{ id: 223, odooId: null, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "11000", country: null, active: true }] });
  await ctx.store.set(K.pricelist(3), { priceListId: "L", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: T, isActive: true });
  expect(await panelData(ctx, "a1")).toEqual({ customerId: 222, syncedAt: T, inactive: true, priceList: { id: 3, name: "Retail_STARTER", imported: true },
    addresses: [{ id: 223, text: "Sklad, Dlouhá 1, 11000 Praha" }] });
});

it("product panel shows only products this plugin links", async () => {
  const { ctx } = mk();
  expect(await productPanelData(ctx, "p1")).toBeNull();
  await ctx.store.set(K.product("p1"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  expect(await productPanelData(ctx, "p1")).toEqual({ oxoId: 11, ref: "537" });
});

it("order panel: link with an OXO ERP URL, waiting and failed states", async () => {
  const { ctx } = mk({}, { orders: [{ id: "o1", status: "SYNC_FAILED" }] });
  expect(await orderPanelData(ctx, "o1")).toBeNull();
  await ctx.store.set(K.failed("o1"), { reason: "boom", at: T });
  await ctx.store.set(K.order("o1"), { oxoId: 501, number: "PRO0501", state: "sale", delivery: "partial", deliveries: [], belowList: ["533002"], sentAt: T, checkedAt: T });
  expect(await orderPanelData(ctx, "o1")).toMatchObject({ link: { number: "PRO0501", url: "https://erp.example.com/prodej/501", belowList: ["533002"] }, waiting: null, failed: { reason: "boom" } });
});

it("account tab lists the account's linked orders, newest first", async () => {
  const { ctx } = mk({}, { orders: [
    { id: "o1", accountId: "a1", number: "ORD-1", orderDate: "2026-10-01", subtotal: "600", currency: "CZK", status: "DELIVERED" },
    { id: "o2", accountId: "a1", number: "ORD-2", orderDate: "2026-10-10", subtotal: "100", currency: "CZK", status: "SENT" },
  ] });
  await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: T, priceListId: null, addresses: [] });
  await ctx.store.set(K.order("o1"), { oxoId: 1, number: "PRO1", state: "sale", delivery: "full", deliveries: [], belowList: [], sentAt: T, checkedAt: T, imported: true });
  await ctx.store.set(K.order("o2"), { oxoId: 2, number: "PRO2", state: "sale", delivery: "none", deliveries: [], belowList: [], sentAt: T, checkedAt: T });
  expect((await accountTabData(ctx, "a1"))?.orders.map((o) => [o.number, o.oxoNumber, o.delivery, o.imported])).toEqual([["ORD-2", "PRO2", "none", false], ["ORD-1", "PRO1", "full", true]]);
});

it("admin data: chosen lists, skipped rules, queued sync, order counts", async () => {
  const { ctx } = mk({}, { orders: [{ id: "o1", status: "READY", externalRef: null }] }, { priceLists: "3", sendOrders: true });
  await ctx.store.set(K.oxoLists, { at: T, lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: 2 }, { id: 4, odooId: null, name: "Wholesale", currency: "CZK", rules: 1 }] });
  await ctx.store.set(K.pricelist(3), { priceListId: "L", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: T, isActive: true });
  await ctx.store.set(K.skipped(3), [{ ruleId: 9, reason: "category Nope not in the CRM" }]);
  await ctx.store.set(K.job, { requestedAt: T });
  await ctx.store.set(K.pending(80), { order: {} });
  const c = await catalogData(ctx);
  expect([c.lists?.map((l) => [l.id, l.chosen]), c.skipped, c.queued]).toEqual([[[3, true], [4, false]], [{ list: "Retail_STARTER", ruleId: 9, reason: "category Nope not in the CRM" }], true]);
  expect(await ordersData(ctx, now)).toMatchObject({ enabled: true, waiting: 1, sent: 0, failed: [], paused: null, pending: 1 });
});
