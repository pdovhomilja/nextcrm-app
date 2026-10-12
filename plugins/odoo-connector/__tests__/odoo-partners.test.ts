import { findOrCreateCustomer, findOrCreateDelivery, salesperson, sameAddress } from "../odoo-partners";
import { K } from "../store";
import { account, mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const odooCustomer = (over = {}) => ({ id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", company_registry: false, vat: false, country_id: [56, "CZ"], street: "Main 1", city: "Praha", zip: "11000", property_product_pricelist: [234, "Retail (CZK)"], ...over });

describe("customer", () => {
  it("uses the linked partner without asking Odoo", async () => {
    const { ctx, client, calls } = mkOrders();
    await ctx.store.set(K.account("a1"), { partnerId: 77, syncedAt: "x", salesperson: null });
    expect(await findOrCreateCustomer(ctx, client, account(), 9, now)).toEqual({ partnerId: 77, created: false });
    expect(calls).toHaveLength(0);
  });

  it("finds by registration number in the account's country and links the account", async () => {
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCustomer({ company_registry: "12345678" })] } });
    expect(await findOrCreateCustomer(ctx, client, account(), 9, now)).toEqual({ partnerId: 50, created: false });
    expect(await ctx.store.get(K.partner(50))).toEqual({ accountId: "a1" });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ partnerId: 50, odooPriceList: [234, "Retail (CZK)"] });
    expect(writes()).toEqual([]);
  });

  it("finds by VAT when the registration number does not match", async () => {
    const { ctx, client } = mkOrders({ sales: { partners: [odooCustomer({ vat: "CZ12345678" })] } });
    expect((await findOrCreateCustomer(ctx, client, account(), 9, now)).partnerId).toBe(50);
  });

  it("creates a company partner with the account's fields when nothing matches", async () => {
    const { ctx, client, sales, calls } = mkOrders();
    const r = await findOrCreateCustomer(ctx, client, account(), 9, now);
    expect(r.created).toBe(true);
    const create = calls.find((c) => c.path === "/json/2/res.partner/create")!;
    expect(create.body.vals_list[0]).toEqual({ name: "Bubble s.r.o.", is_company: true, company_registry: "12345678", vat: "CZ12345678", street: "Main 1", city: "Praha", zip: "110 00", country_id: 56, email: "info@bubble.example", phone: "+420 111", customer_rank: 1, user_id: 9 });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ partnerId: r.partnerId });
    expect(sales.partners).toHaveLength(1);
  });

  it("gives a created customer the Odoo list behind the account's CRM price list (live check)", async () => {
    const { ctx, client, calls } = mkOrders();
    await ctx.store.set(K.pricelist(235), { priceListId: "pl-crm", name: "Retail", ruleCount: 1, syncedAt: "x" });
    await findOrCreateCustomer(ctx, client, account({ pricelist_id: "pl-crm" }), 9, now);
    const create = calls.find((c) => c.path === "/json/2/res.partner/create")!;
    expect(create.body.vals_list[0].property_product_pricelist).toBe(235);
  });

  it("finds a name-only customer it created before (Review Focus 2)", async () => {
    const acc = account({ company_id: null, vat: null });
    const { ctx, client, sales } = mkOrders({ sales: { fail: { "res.partner/create": "after" } } });
    await expect(findOrCreateCustomer(ctx, client, acc, false, now)).rejects.toMatchObject({ status: 500 });
    expect(await findOrCreateCustomer(ctx, client, acc, false, now)).toEqual({ partnerId: 1000, created: false });
    expect(sales.partners).toHaveLength(1);
  });

  it("falls back to the default country", async () => {
    const { ctx, client, calls } = mkOrders();
    await findOrCreateCustomer(ctx, client, account({ billing_country: null, company_id: null, vat: null }), false, now);
    expect(calls.find((c) => c.path === "/json/2/res.partner/create")!.body.vals_list[0].country_id).toBe(56);
  });
});

describe("salesperson", () => {
  it("matches the owner's email case-insensitively, else false", async () => {
    const { ctx, client } = mkOrders();
    expect(await salesperson(ctx, client, "u-rep")).toBe(9);
    expect(await salesperson(ctx, client, null)).toBe(false);
    expect(await salesperson(ctx, client, "nobody")).toBe(false);
  });
});

describe("delivery address", () => {
  it("ships to the customer when the order has no address", async () => {
    const { ctx, client, calls } = mkOrders();
    expect(await findOrCreateDelivery(ctx, client, 50, order())).toEqual({ shippingId: 50, created: false });
    expect(calls).toHaveLength(0);
  });

  it("uses the customer itself or a delivery child when the address matches (normalized)", async () => {
    const child = { id: 51, parent_id: [50, "x"], type: "delivery", active: true, street: "Depot  Road 5", city: "BRNO", zip: "602 00" };
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCustomer(), child] } });
    expect(await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "main 1", shipping_city: "praha", shipping_postal_code: "110 00" }))).toEqual({ shippingId: 50, created: false });
    expect(await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "Depot Road 5", shipping_city: "Brno", shipping_postal_code: "60200" }))).toEqual({ shippingId: 51, created: false });
    expect(writes()).toEqual([]);
  });

  it("creates a delivery child when nothing matches", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [odooCustomer()] } });
    const r = await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "New 9", shipping_city: "Ostrava", shipping_postal_code: "70030", shipping_country: "CZ" }));
    expect(r.created).toBe(true);
    expect(calls.find((c) => c.path === "/json/2/res.partner/create")!.body.vals_list[0]).toEqual({ parent_id: 50, type: "delivery", street: "New 9", city: "Ostrava", zip: "70030", country_id: 56 });
  });

  it("compares addresses ignoring case, spaces and postal-code spacing", () => {
    expect(sameAddress({ street: " Main  1", city: "PRAHA", zip: "110 00" }, { street: "main 1", city: "Praha", zip: "11000" })).toBe(true);
    expect(sameAddress({ street: "Main 1", city: "Praha", zip: "11000" }, { street: "Main 2", city: "Praha", zip: "11000" })).toBe(false);
  });
});
