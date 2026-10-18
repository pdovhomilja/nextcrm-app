import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { K } from "../store";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

const run = (ctx: TestCtx, dry = false): CustomerRun => ({ ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() });
const acc = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `Acc ${id}`, company_id: null, vat: null, billing_postal_code: null, assigned_to: "u-rep", deletedAt: null, ...over });

describe("customers", () => {
  it("takes over accounts by IČO (CZ padded), then DIČ, then name + zip; keeps their owner", async () => {
    const { ctx, client, data } = mk({ customers: [
      customer(1, { ico: "1234567", name: "One" }),
      customer(2, { dic: "CZ 99", name: "Two" }),
      customer(3, { name: "Kavárna u Mostu", zip: "110 00" }),
    ] }, { accounts: [acc("a1", { company_id: "01234567" }), acc("a2", { vat: "cz99" }), acc("a3", { name: "kavárna u mostu", billing_postal_code: "11000" })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.vat, r.counts.name, r.counts.created]).toEqual([1, 1, 1, 0]);
    expect([await ctx.store.get(K.customer(1)), await ctx.store.get(K.customer(2)), await ctx.store.get(K.customer(3))]).toEqual([{ accountId: "a1" }, { accountId: "a2" }, { accountId: "a3" }]);
    expect(r.rows.name).toEqual([{ customerId: 3, name: "Kavárna u Mostu", accountId: "a3" }]);
    expect(data.accounts.map((a) => a.assigned_to)).toEqual(["u-rep", "u-rep", "u-rep"]);
    expect(data.accounts[0].name).toBe("One");
  });

  it("creates an account without an owner when nothing matches, country from the name or the default", async () => {
    const { ctx, client, data } = mk({ customers: [customer(5, { name: "New Bar", country: null, priceListId: 3, addresses: [
      { id: 50, odooId: null, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "11000", country: null, active: true },
      { id: 51, odooId: null, name: "Old", street: null, city: null, zip: null, country: null, active: false },
    ] })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(data.accounts).toEqual([expect.objectContaining({ name: "New Bar", billing_country: "CZ", assigned_to: null, status: "Active" })]);
    expect(r.rows.created).toEqual([{ customerId: 5, name: "New Bar" }]);
    const link = await ctx.store.get<{ customerId: number; priceListId: number; addresses: { id: number }[] }>(K.account(data.accounts[0].id as string));
    expect([link?.customerId, link?.priceListId, link?.addresses.map((a) => a.id)]).toEqual([5, 3, [50]]);
  });

  it("two matching accounts → conflict, nothing linked; fixed CRM data links on the next run without an OXO ERP change", async () => {
    const { ctx, client, data } = mk({ customers: [customer(7, { ico: "11111111" })] }, { accounts: [acc("a1", { company_id: "11111111" }), acc("a2", { company_id: "11111111" })] });
    let r = run(ctx);
    const top = await syncCustomers(r, client);
    expect([r.counts.conflicts, await ctx.store.get(K.customer(7))]).toEqual([1, null]);
    expect([top, r.rows.conflicts]).toEqual(["2026-10-18T08:00:00.000Z", [{ customerId: 7, name: "Co 7", reason: "number", candidates: ["a1", "a2"] }]]);
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-19T00:00:00.000Z" });   // OXO ERP returns nothing new: only the stored conflict is re-tried
    data.accounts[1].deletedAt = "2026-10-18";
    r = run(ctx);
    await syncCustomers(r, client);
    expect([await ctx.store.get(K.customer(7)), await ctx.store.get(K.conflict(7))]).toEqual([{ accountId: "a1" }, null]);
  });

  it("one account is never linked to two customers, not even inside one dry run", async () => {
    const { ctx, client } = mk({ customers: [customer(1, { ico: "22222222" }), customer(2, { ico: "22222222", updatedAt: "2026-10-18T08:00:01.000Z" })] }, { accounts: [acc("a1", { company_id: "22222222" })] });
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.conflicts, r.rows.conflicts[0]?.reason]).toEqual([1, 1, "linked"]);
  });

  it("dry run writes nothing", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "1", name: "Changed" }), customer(2)] }, { accounts: [acc("a1", { company_id: "00000001" })] });
    const before = JSON.stringify(data);
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.updated, r.counts.created]).toEqual([1, 1, 1]);
    expect(JSON.stringify(data)).toBe(before);
    expect(await ctx.store.list("")).toEqual([]);
  });

  it("an inactive customer is not written; its link is marked inactive", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { active: false, name: "Closed" })] }, { accounts: [acc("a1")] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.skipped, data.accounts[0].name, (await ctx.store.get<{ inactive: boolean }>(K.account("a1")))?.inactive]).toEqual([1, "Acc a1", true]);
  });

  it("reads only changes since the cursor minus 2 minutes and returns the newest updatedAt", async () => {
    const { ctx, client, oxo } = mk({ customers: [customer(1, { updatedAt: "2026-10-18T08:30:00.000Z" })] });
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-18T08:00:00.000Z" });
    expect(await syncCustomers(run(ctx), client)).toBe("2026-10-18T08:30:00.000Z");
    expect(oxo.calls[0].params.updatedSince).toBe("2026-10-18T07:58:00.000Z");
  });

  it("a failed write is retried from the stored copy", async () => {
    const { ctx, client } = mk({ customers: [customer(1)] });
    const create = ctx.data.accounts.create;
    ctx.data.accounts.create = async () => { throw new Error("db down"); };
    let r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.failed, (await ctx.store.get<{ customer: { id: number } }>(K.retry(1)))?.customer.id]).toEqual([1, 1]);
    ctx.data.accounts.create = create;
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-19T00:00:00.000Z" });
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.created, await ctx.store.get(K.retry(1))]).toEqual([1, null]);
  });
});
