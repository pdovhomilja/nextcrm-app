import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync } from "../sync";
import { confirmProposal, rejectProposal } from "../proposals";
import { K, type Proposal } from "../store";
import { company, mk, now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);

describe("first link of an Odoo customer needs a manager's confirmation", () => {
  const acc = (over: RecordData): RecordData => ({ id: "a1", name: "Old name", company_id: null, vat: null, billing_country: "CZ", deletedAt: null, assigned_to: "someone", ...over });
  const setup = () => {
    const accounts = [acc({ company_id: "27082440" })];
    return { accounts, ...mk([company(1, { company_registry: "27082440" })], accounts) };
  };

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
    expect(await ctx.store.get(K.proposal(1))).toMatchObject({ partnerId: 1, accountId: "a1", reason, name: "Co 1" });
  });

  it("an existing link syncs as today and is never proposed", async () => {
    const { ctx, client, accounts } = setup();
    await ctx.store.set(K.partner(1), { accountId: "a1" });
    await runSync(ctx, client, now);
    expect(accounts[0].name).toBe("Co 1");
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
  });

  it("confirm: the next run links the pair exactly as the automatic path did", async () => {
    const { ctx, client, accounts } = setup();
    await runSync(ctx, client, now);
    await confirmProposal(ctx, { partnerId: "1", accountId: "a1" }, now);
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
    expect(await ctx.store.get(K.job("sync"))).toBeTruthy();
    await runSync(ctx, client, later(1));
    expect(await ctx.store.get(K.partner(1))).toEqual({ accountId: "a1" });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ partnerId: 1 });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ name: "Co 1", assigned_to: "someone" });
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
  });

  it("reject: never proposed again; the customer gets its own account, as with no match", async () => {
    const { ctx, client, accounts } = setup();
    await runSync(ctx, client, now);
    await rejectProposal(ctx, { partnerId: "1", accountId: "a1" }, now);
    await runSync(ctx, client, later(1));
    await runSync(ctx, client, later(2));
    expect(await ctx.store.get(K.proposal(1))).toBeNull();
    expect(accounts[0]).toEqual(acc({ company_id: "27082440" }));
    expect(accounts).toHaveLength(2);
    expect(await ctx.store.get(K.partner(1))).toEqual({ accountId: accounts[1].id });
  });

  it("confirm/reject refuse a pair that is not the stored proposal", async () => {
    const { ctx, client } = setup();
    await runSync(ctx, client, now);
    await expect(confirmProposal(ctx, { partnerId: "1", accountId: "a2" }, now)).rejects.toThrow();
    await expect(rejectProposal(ctx, { partnerId: "2", accountId: "a1" }, now)).rejects.toThrow();
    expect(await ctx.store.get<Proposal>(K.proposal(1))).toMatchObject({ accountId: "a1" });
    expect(await ctx.store.get(K.confirmed(1, "a2"))).toBeNull();
  });

  it("confirm refuses an account another customer is already linked to", async () => {
    const accounts = [acc({ company_id: "27082440" })];
    const { ctx, client } = mk([company(1, { company_registry: "27082440" }), company(2, { company_registry: "27082440" })], accounts);
    await runSync(ctx, client, now);
    expect([await ctx.store.get(K.proposal(1)), await ctx.store.get(K.proposal(2))]).toEqual([expect.objectContaining({ accountId: "a1" }), expect.objectContaining({ accountId: "a1" })]);
    await confirmProposal(ctx, { partnerId: "1", accountId: "a1" }, now);
    await runSync(ctx, client, later(1));
    await expect(confirmProposal(ctx, { partnerId: "2", accountId: "a1" }, later(2))).rejects.toThrow();
    expect(await ctx.store.get(K.partner(2))).toBeNull();
  });

  it("tells managers and admins once when a run adds proposals; a dry run stores none", async () => {
    const { ctx, client } = setup();
    await runSync(ctx, client, now);
    await runSync(ctx, client, later(1));
    expect(ctx.notifications).toEqual([expect.objectContaining({ roles: ["manager", "admin"] })]);
    const dry = mk([company(1, { company_registry: "27082440" })], [acc({ company_id: "27082440" })], { dryRun: true });
    await runSync(dry.ctx, dry.client, now);
    expect(await dry.ctx.store.get(K.proposal(1))).toBeNull();
    expect(dry.ctx.notifications).toEqual([]);
  });
});
