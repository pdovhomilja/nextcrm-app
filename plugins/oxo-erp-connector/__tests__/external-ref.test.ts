import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { createTranslator } from "next-intl";
import en from "../messages/en.json";
import { K } from "../store";
import { summaryText } from "../sync";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

const run = (ctx: TestCtx, dry = false): CustomerRun => ({ ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() });

// Other systems (e.g. a customer portal reading the CRM over MCP) find the OXO ERP customer through the account's external_ref:
// a bare number = Odoo partner id, `oxo:<id>` = OXO ERP customer id.
describe("account external_ref", () => {
  it("a new account gets the Odoo id, or oxo:<id> when the customer has none", async () => {
    const { ctx, client, data } = mk({ customers: [customer(5, { odooId: 812, name: "Kavárna Na Rohu" }), customer(6, { name: "Bistro Pod Mostem" })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(data.accounts.map((a) => [a.name, a.external_ref])).toEqual([["Kavárna Na Rohu", "812"], ["Bistro Pod Mostem", "oxo:6"]]);
    expect(r.counts.refs).toBe(2);
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
    expect(r.counts.refs).toBe(2);
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
    expect([r.counts.refs, data.accounts.map((a) => a.external_ref ?? null)]).toEqual([2, [null, null, "777", null]]);
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.refs, data.accounts.map((a) => a.external_ref ?? null)]).toEqual([2, ["51", "oxo:2", "777", null]]);
    const calls = oxo.calls.length;
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.refs, oxo.calls.slice(calls).map((c) => c.params.updatedSince ?? "all")]).toEqual([0, ["2026-10-18T23:58:00.000Z"]]);   // nothing missing: no full customer read
  });

  it("a linked customer that also changed is counted once in a dry run", async () => {
    const { ctx, client } = mk({ customers: [customer(1, { odooId: 51 })] }, { accounts: [{ id: "a1", name: "Co 1", external_ref: null, deletedAt: null }] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.linked, r.counts.refs]).toEqual([1, 1]);
  });
});

it("a summary stored before 0.1.1 (no refs count) still shows its customer line", () => {
  const { ctx } = mk();
  const t = createTranslator({ locale: "en", messages: en, onError: (e) => { throw e; } });
  ctx.t = ((key: string, params?: Record<string, unknown>) => t(key as never, params as never)) as never;
  const { refs: _, ...old } = zeroCustomers();
  expect(summaryText(ctx, { at: now.toISOString(), ok: true, dryRun: true, customers: old as never, rows: emptyRows() })).toContain("0 external_ref filled");
});
