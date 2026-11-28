import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { confirmProposal, rejectProposal } from "../proposals";
import { K, type Proposal } from "../store";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

const run = (ctx: TestCtx, dry = false): CustomerRun => ({ ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map(), refsDecided: new Set(), proposed: 0 });
const acc = (over: Record<string, unknown> = {}) => ({ id: "a1", name: "Acc a1", company_id: null, vat: null, billing_postal_code: null, assigned_to: "u-rep", deletedAt: null, ...over });
// The customer is unchanged in OXO ERP after the first run: later runs see it only through the stored proposal.
const setup = () => {
  const oxo = { customers: [customer(1, { ico: "1234567", name: "One" })] };
  const env = mk(oxo, { accounts: [acc({ company_id: "01234567" })] });
  return { ...env, quiet: () => { oxo.customers.length = 0; } };
};

describe("first link of an OXO ERP customer needs a manager's confirmation", () => {
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
    expect(await ctx.store.get(K.proposal(1))).toMatchObject({ customerId: 1, accountId: "a1", reason });
  });

  it("two customers on one account: one proposal, the other a conflict", async () => {
    const { ctx, client } = mk({ customers: [customer(1, { ico: "22222222" }), customer(2, { ico: "22222222" })] }, { accounts: [acc({ company_id: "22222222" })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([await ctx.store.get(K.proposal(1)), await ctx.store.get(K.proposal(2))]).toEqual([expect.objectContaining({ accountId: "a1" }), null]);
    expect(r.rows.conflicts).toEqual([expect.objectContaining({ customerId: 2, reason: "linked" })]);
  });

  it("an existing link syncs as today and is never proposed", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "1234567", name: "One" })] }, { accounts: [acc({ company_id: "01234567" })] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await syncCustomers(run(ctx), client);
    expect(data.accounts[0].name).toBe("One");
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
  });

  it("confirm: the next run links the pair exactly as the automatic path did, with OXO ERP unchanged", async () => {
    const { ctx, client, data, quiet } = setup();
    await syncCustomers(run(ctx), client);
    quiet();
    await confirmProposal(ctx, { customerId: "1", accountId: "a1" }, now);
    expect(await ctx.store.get(K.job)).toBeTruthy();
    await syncCustomers(run(ctx), client);
    expect(await ctx.store.get(K.customer(1))).toEqual({ accountId: "a1" });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ customerId: 1 });
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0]).toMatchObject({ name: "One", assigned_to: "u-rep" });
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
  });

  it("reject: never proposed again; the customer gets its own account, as with no match", async () => {
    const { ctx, client, data, quiet } = setup();
    await syncCustomers(run(ctx), client);
    quiet();
    await rejectProposal(ctx, { customerId: "1", accountId: "a1" }, now);
    await syncCustomers(run(ctx), client);
    await syncCustomers(run(ctx), client);
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
    expect(data.accounts[0]).toEqual(acc({ company_id: "01234567" }));
    expect(data.accounts).toHaveLength(2);
    expect(await ctx.store.get(K.customer(1))).toEqual({ accountId: data.accounts[1].id });
  });

  it("confirm/reject refuse a pair that is not the open proposal, or one already decided", async () => {
    const { ctx, client } = setup();
    await syncCustomers(run(ctx), client);
    await expect(confirmProposal(ctx, { customerId: "1", accountId: "a2" }, now)).rejects.toThrow();
    await expect(rejectProposal(ctx, { customerId: "2", accountId: "a1" }, now)).rejects.toThrow();
    expect(await ctx.store.get(K.confirmed(1, "a2"))).toBeNull();
    await confirmProposal(ctx, { customerId: "1", accountId: "a1" }, now);
    await expect(rejectProposal(ctx, { customerId: "1", accountId: "a1" }, now)).rejects.toThrow();
    expect(await ctx.store.get<Proposal>(K.proposal(1))).toMatchObject({ decided: "confirmed" });
    expect(await ctx.store.get(K.rejected(1, "a1"))).toBeNull();
  });

  it("confirm is refused when another customer was linked to the account in the meantime", async () => {
    const { ctx, client } = setup();
    await syncCustomers(run(ctx), client);
    await ctx.store.set(K.account("a1"), { customerId: 7, syncedAt: "x", priceListId: null, addresses: [] });
    await expect(confirmProposal(ctx, { customerId: "1", accountId: "a1" }, now)).rejects.toThrow(ctx.t("proposals.taken"));
    expect(await ctx.store.get(K.confirmed(1, "a1"))).toBeNull();
    expect(await ctx.store.get<Proposal>(K.proposal(1))).not.toHaveProperty("decided");
  });

  it("tells managers and admins once when a run adds proposals; a dry run stores none", async () => {
    const { ctx, client } = setup();
    await syncCustomers(run(ctx), client);
    await syncCustomers(run(ctx), client);
    expect(ctx.notifications).toEqual([expect.objectContaining({ roles: ["manager", "admin"] })]);
    const dry = setup();
    await syncCustomers(run(dry.ctx, true), dry.client);
    expect(await dry.ctx.store.get(K.proposal(1))).toBeNull();
    expect(dry.ctx.notifications).toEqual([]);
  });
});

describe("external_ref waits for the confirmation", () => {
  it("a proposal leaves the candidate's external_ref empty, also after the backfill of a later run", async () => {
    const { ctx, client, data, quiet } = setup();
    const r = run(ctx);
    await syncCustomers(r, client);
    quiet();
    await syncCustomers(run(ctx), client);
    expect([r.counts.externalRefsFilled, data.accounts[0].external_ref ?? null, r.refsDecided.has("a1")]).toEqual([0, null, false]);
  });

  it("confirming writes it in the run that links the pair", async () => {
    const { ctx, client, data, quiet } = setup();
    await syncCustomers(run(ctx), client);
    quiet();
    await confirmProposal(ctx, { customerId: "1", accountId: "a1" }, now);
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts[0].external_ref]).toEqual([1, "oxo:1"]);
  });

  it("a dry run writes nothing, before or after the confirmation", async () => {
    const { ctx, client, data } = setup();
    await syncCustomers(run(ctx, true), client);
    expect([data.accounts[0].external_ref ?? null, await ctx.store.get(K.proposal(1))]).toEqual([null, null]);
    await syncCustomers(run(ctx), client);
    await confirmProposal(ctx, { customerId: "1", accountId: "a1" }, now);
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.externalRefsFilled, data.accounts[0].external_ref ?? null, await ctx.store.get(K.account("a1"))]).toEqual([1, null, null]);
  });
});
