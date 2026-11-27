import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync } from "../sync";
import { K } from "../store";
import { company, mk, now } from "./helpers";

// Spec for the manager-confirmed first link (design in the PR). Skipped until
// the host can run a manager's Confirm / Reject; the store keys are the design's:
// `proposal:<partnerId>` and `rejected:<partnerId>:<accountId>`.
describe.skip("first link of an Odoo customer needs a manager's confirmation", () => {
  const acc = (over: RecordData): RecordData => ({ id: "a1", name: "Old name", company_id: null, vat: null, billing_country: "CZ", deletedAt: null, assigned_to: "someone", ...over });

  it.each([
    ["number", { company_id: "27082440" }, { company_registry: "27082440" }],
    ["vat", { vat: "CZ11111111" }, { vat: "CZ11111111" }],
  ])("a first match by %s becomes a proposal: no link, no new account, the account untouched", async (reason, account, partner) => {
    const accounts = [acc(account)];
    const { ctx, client } = mk([company(1, partner)], accounts);
    expect(await runSync(ctx, client, now)).toMatchObject({ created: 0, updated: 0 });
    expect(await ctx.store.get(K.partner(1))).toBeNull();
    expect(await ctx.store.get(K.account("a1"))).toBeNull();
    expect(accounts).toEqual([acc(account)]);
    expect(await ctx.store.get("proposal:1")).toMatchObject({ partnerId: 1, accountId: "a1", reason, name: "Co 1" });
  });

  it("an existing link syncs as today and is never proposed", async () => {
    const accounts = [acc({ company_id: "27082440" })];
    const { ctx, client } = mk([company(1, { company_registry: "27082440" })], accounts);
    await ctx.store.set(K.partner(1), { accountId: "a1" });
    await runSync(ctx, client, now);
    expect(accounts[0].name).toBe("Co 1");
    expect(await ctx.store.get("proposal:1")).toBeNull();
  });

  it("a rejected pair is not proposed again: the customer gets its own account, as with no match", async () => {
    const accounts = [acc({ company_id: "27082440" })];
    const { ctx, client } = mk([company(1, { company_registry: "27082440" })], accounts);
    await ctx.store.set("rejected:1:a1", { at: now.toISOString() });
    await runSync(ctx, client, now);
    expect(await ctx.store.get("proposal:1")).toBeNull();
    expect(accounts[0]).toEqual(acc({ company_id: "27082440" }));
    expect(accounts).toHaveLength(2);
    expect(await ctx.store.get(K.partner(1))).toEqual({ accountId: accounts[1].id });
  });
});
