import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { createTranslator } from "next-intl";
import en from "../messages/en.json";
import { K } from "../store";
import { summaryText } from "../sync";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

const run = (ctx: TestCtx, dry = false): CustomerRun => ({ ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map(), refsDecided: new Set() });

// Other systems (e.g. a customer portal reading the CRM over MCP) find the OXO ERP customer through the account's external_ref:
// a bare number = Odoo partner id, `oxo:<id>` = OXO ERP customer id.
describe("account external_ref", () => {
  it("a new account gets the Odoo id, or oxo:<id> when the customer has none", async () => {
    const { ctx, client, data } = mk({ customers: [customer(5, { odooId: 812, name: "Kavárna Na Rohu" }), customer(6, { name: "Bistro Pod Mostem" })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(data.accounts.map((a) => [a.name, a.external_ref])).toEqual([["Kavárna Na Rohu", "812"], ["Bistro Pod Mostem", "oxo:6"]]);
    expect(r.counts.externalRefsFilled).toBe(2);
  });

  it("a matched account without one gets it; a different existing one is kept and logged", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "11111111", odooId: 41 }), customer(2, { ico: "22222222" }), customer(3, { ico: "33333333", odooId: 43 })] }, { accounts: [
      { id: "a1", name: "Co 1", company_id: "11111111", external_ref: null, deletedAt: null },
      { id: "a2", name: "Co 2", company_id: "22222222", external_ref: "", deletedAt: null },
      { id: "a3", name: "Co 3", company_id: "33333333", external_ref: "999", deletedAt: null },
    ] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(data.accounts.map((a) => a.external_ref)).toEqual(["41", "oxo:2", "999"]);
    expect(r.counts.externalRefsFilled).toBe(2);
    expect(ctx.logs.filter((l) => l.level === "warn").map((l) => l.message)).toEqual(["Account a3 keeps external_ref 999; OXO ERP customer 3 would give 43"]);
  });

  it("accounts linked earlier get it on a normal run without an OXO ERP change; a dry run only counts", async () => {
    const { ctx, client, data, oxo } = mk({ customers: [customer(1, { odooId: 51 }), customer(2), customer(3, { odooId: 53 }), customer(4)] }, { accounts: [
      { id: "a1", name: "Co 1", external_ref: null, deletedAt: null },
      { id: "a2", name: "Co 2", deletedAt: null },
      { id: "a3", name: "Co 3", external_ref: "777", deletedAt: null },
      { id: "a4", name: "Co 4", external_ref: null, deletedAt: "2026-10-01" },
    ] });
    for (const [n, a] of [[1, "a1"], [2, "a2"], [3, "a3"], [4, "a4"]] as const) {
      await ctx.store.set(K.customer(n), { accountId: a });
      await ctx.store.set(K.account(a), { customerId: n, syncedAt: "x", priceListId: null, addresses: [] });
    }
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-19T00:00:00.000Z" });   // nothing changed in OXO ERP
    let r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts.map((a) => a.external_ref ?? null)]).toEqual([2, [null, null, "777", null]]);
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts.map((a) => a.external_ref ?? null)]).toEqual([2, ["51", "oxo:2", "777", null]]);
    const calls = oxo.calls.length;
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, oxo.calls.slice(calls).map((c) => c.params.updatedSince ?? "all")]).toEqual([0, ["2026-10-18T23:58:00.000Z"]]);   // nothing missing: no full customer read
  });

  it("never writes a value another live account already holds, on either path", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "11111111", odooId: 41, updatedAt: "2026-10-18T09:00:00.000Z" }), customer(2, { odooId: 42 })] }, { accounts: [
      { id: "a1", name: "Co 1", company_id: "11111111", external_ref: null, deletedAt: null },
      { id: "a2", name: "Co 2", external_ref: null, deletedAt: null },
      { id: "a8", name: "Old", external_ref: "41", deletedAt: null },
      { id: "a9", name: "Old 2", external_ref: "42", deletedAt: null },
    ] });
    await ctx.store.set(K.customer(2), { accountId: "a2" });
    await ctx.store.set(K.account("a2"), { customerId: 2, syncedAt: "x", priceListId: null, addresses: [] });
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-18T08:30:00.000Z" });   // only customer 1 changed; a2 comes from the stored link
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts.map((a) => a.external_ref)]).toEqual([0, [null, null, "41", "42"]]);
    expect(ctx.logs.filter((l) => l.level === "warn").map((l) => l.message)).toEqual([
      "Account a1 not given external_ref 41: account a8 already has it",
      "Account a2 not given external_ref 42: account a9 already has it",
    ]);
  });

  it("a linked customer missing from OXO ERP's list is logged, not silently skipped", async () => {
    const { ctx, client, data } = mk({ customers: [] }, { accounts: [{ id: "a5", name: "Gone", external_ref: null, deletedAt: null }] });
    await ctx.store.set(K.account("a5"), { customerId: 99, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts[0].external_ref]).toEqual([0, null]);
    expect(ctx.logs.filter((l) => l.level === "warn").map((l) => l.message)).toEqual(["Account a5 has no external_ref: OXO ERP customer 99 is not in its customer list"]);
  });

  it("an inactive linked customer that changed in this run still gets its ref", async () => {
    const { ctx, client, data } = mk({ customers: [customer(3, { active: false, odooId: 63 })] }, { accounts: [{ id: "a3", name: "Closed", external_ref: null, deletedAt: null }] });
    await ctx.store.set(K.customer(3), { accountId: "a3" });
    await ctx.store.set(K.account("a3"), { customerId: 3, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.skipped, r.counts.externalRefsFilled, data.accounts[0].external_ref]).toEqual([1, 1, "63"]);
  });

  it("a linked customer that also changed is counted once in a dry run", async () => {
    const { ctx, client } = mk({ customers: [customer(1, { odooId: 51 })] }, { accounts: [{ id: "a1", name: "Co 1", external_ref: null, deletedAt: null }] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.linked, r.counts.externalRefsFilled]).toEqual([1, 1]);
  });
});

it("a summary stored before 0.1.1 (no refs count) still shows its customer line", () => {
  const { ctx } = mk();
  const t = createTranslator({ locale: "en", messages: en, onError: (e) => { throw e; } });
  ctx.t = ((key: string, params?: Record<string, unknown>) => t(key as never, params as never)) as never;
  const { externalRefsFilled: _, ...old } = zeroCustomers();
  expect(summaryText(ctx, { at: now.toISOString(), ok: true, dryRun: true, customers: old as never, rows: emptyRows() })).toContain("0 external_ref filled");
});
