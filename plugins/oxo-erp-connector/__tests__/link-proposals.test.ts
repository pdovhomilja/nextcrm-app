import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { K } from "../store";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

// Spec for the manager-confirmed first link (design in the PR). Skipped until
// the host can run a manager's Confirm / Reject; the store keys are the design's:
// `proposal:<customerId>` and `rejected:<customerId>:<accountId>`.
const run = (ctx: TestCtx): CustomerRun => ({ ctx, dry: false, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() });
const acc = (over: Record<string, unknown> = {}) => ({ id: "a1", name: "Acc a1", company_id: null, vat: null, billing_postal_code: null, assigned_to: "u-rep", deletedAt: null, ...over });

describe.skip("first link of an OXO ERP customer needs a manager's confirmation", () => {
  it.each([
    ["number", { company_id: "01234567" }, { ico: "1234567", name: "One" }],
    ["vat", { vat: "cz99" }, { dic: "CZ 99", name: "One" }],
    ["name", { name: "kavárna u mostu", billing_postal_code: "11000" }, { name: "Kavárna u Mostu", zip: "110 00" }],
  ])("a first match by %s becomes a proposal: no link, no new account, the account untouched", async (reason, account, cust) => {
    const { ctx, client, data } = mk({ customers: [customer(1, cust)] }, { accounts: [acc(account)] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(r.counts.created).toBe(0);
    expect(await ctx.store.get(K.customer(1))).toBeNull();
    expect(await ctx.store.get(K.account("a1"))).toBeNull();
    expect(data.accounts).toEqual([acc(account)]);
    expect(await ctx.store.get("proposal:1")).toMatchObject({ customerId: 1, accountId: "a1", reason });
  });

  it("an existing link syncs as today and is never proposed", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "1234567", name: "One" })] }, { accounts: [acc({ company_id: "01234567" })] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await syncCustomers(run(ctx), client);
    expect(data.accounts[0].name).toBe("One");
    expect(await ctx.store.get("proposal:1")).toBeNull();
  });

  it("a rejected pair is not proposed again: the customer gets its own account, as with no match", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "1234567", name: "One" })] }, { accounts: [acc({ company_id: "01234567" })] });
    await ctx.store.set("rejected:1:a1", { at: now.toISOString() });
    await syncCustomers(run(ctx), client);
    expect(await ctx.store.get("proposal:1")).toBeNull();
    expect(data.accounts[0]).toEqual(acc({ company_id: "01234567" }));
    expect(data.accounts).toHaveLength(2);
    expect(await ctx.store.get(K.customer(1))).toEqual({ accountId: data.accounts[1].id });
  });
});
