import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { catalogData, needsOwner, panelData, productPanelData } from "../ui/data";
import { mk } from "./helpers";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com", database: "db" });

it("lists linked accounts without an owner, with the Odoo salesperson", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S, data: { accounts: [
    { id: "a1", name: "No owner", assigned_to: null, deletedAt: null }, { id: "a2", name: "Owned", assigned_to: "u1", deletedAt: null },
  ] } }) as unknown as Ctx;
  await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: "Rep X" });
  await ctx.store.set(K.account("a2"), { partnerId: 2, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null });
  expect(await needsOwner(ctx)).toEqual([{ accountId: "a1", name: "No owner", salesperson: "Rep X" }]);
});

it("builds the panel only for linked accounts", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S }) as unknown as Ctx;
  expect(await panelData(ctx, "a1")).toBeNull();
  await ctx.store.set(K.account("a1"), { partnerId: 42, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null, archived: true });
  expect(await panelData(ctx, "a1")).toEqual({ partnerId: 42, url: "https://odoo.example.com/odoo/contacts/42", syncedAt: "2026-10-13T08:00:00.000Z", archived: true, notCustomer: false, priceList: null });
});

describe("catalog screens", () => {
  it("marks chosen lists and reports queued jobs and skipped rules", async () => {
    const { ctx } = mk([], [], { priceLists: "245" });
    await ctx.store.set(K.odooLists, { at: "2026-10-10T10:00:00Z", lists: [{ id: 245, name: "Gold", currency: "CZK", rules: 16, active: true }, { id: 246, name: "Plat", currency: "CZK", rules: 16, active: true }] });
    await ctx.store.set(K.job("compare"), { requestedAt: "x" });
    await ctx.store.set(K.pricelist(245), { priceListId: "L", name: "Gold", ruleCount: 16, syncedAt: "x" });
    await ctx.store.set(K.skipped(245), [{ ruleId: 9, reason: "applied_on 4_combo" }]);
    const d = await catalogData(ctx);
    expect(d.lists?.map((l) => [l.id, l.chosen])).toEqual([[245, true], [246, false]]);
    expect(d.queued).toEqual({ sync: false, compare: true });
    expect(d.skipped).toEqual([{ list: "Gold", ruleId: 9, reason: "applied_on 4_combo" }]);
  });

  it("links an imported product to Odoo", async () => {
    const { ctx } = mk([], [], {});
    (ctx.data.products as { get: unknown }).get = async () => ({ id: "p1", source: "EXTERNAL", externalRef: "500" });
    await ctx.store.set(K.product(500), { productId: "p1", tmplId: 912, categoryRef: "7" });
    expect(await productPanelData(ctx, "p1")).toEqual({ odooId: 500, url: "https://odoo.example.com/web#model=product.product&id=500&view_type=form", syncedAt: null });
  });

  it("shows the account's Odoo price list and whether it is imported", async () => {
    const { ctx } = mk([], [], {});
    await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-10T10:00:00Z", salesperson: null, odooPriceList: [250, "Other"] });
    expect((await panelData(ctx, "a1"))?.priceList).toEqual({ name: "Other", imported: false });
  });
});

it("does not call a list applied when it was removed from the setting (review I2)", async () => {
  const { ctx } = mk([], [], {});
  await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-10T10:00:00Z", salesperson: null, odooPriceList: [245, "Gold"] });
  await ctx.store.set(K.pricelist(245), { priceListId: "L", name: "Gold", ruleCount: 1, syncedAt: "x", isActive: false });
  expect((await panelData(ctx, "a1"))?.priceList).toEqual({ name: "Gold", imported: false });
});
