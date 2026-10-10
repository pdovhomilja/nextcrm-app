import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync, scheduledSync } from "../sync";
import { OdooAuthError } from "../odoo";
import { K, type AccountLink, type Conflict, type RunSummary } from "../store";
import { company, mk, now } from "./helpers";

it("imports customers on the first run: create, link by number, link by VAT, owner by email", async () => {
  const accounts: RecordData[] = [
    { id: "a1", name: "Old name", company_id: "27082440", vat: null, billing_country: "CZ", deletedAt: null, assigned_to: "someone" },
    { id: "a2", name: "VAT match", company_id: null, vat: "CZ11111111", billing_country: "CZ", deletedAt: null, assigned_to: null },
  ];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), company(2, { vat: "CZ11111111" }), company(3, { name: "Bob Customer", is_company: false, user_id: false }), company(4, { customer_rank: 0 })], accounts);
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, created: 1, updated: 2, conflicts: 0 });
  expect(accounts.find((a) => a.id === "a1")).toMatchObject({ name: "Co 1", assigned_to: "someone" });   // owner kept
  const created = accounts.find((a) => a.name === "Bob Customer")!;
  expect(created).toMatchObject({ billing_country: "CZ", assigned_to: null });
  expect(await ctx.store.get<AccountLink>(K.account(created.id as string))).toMatchObject({ partnerId: 3, salesperson: null });
  expect(await ctx.store.get(K.cursor)).toEqual({ at: "2026-10-10 08:00:00" });
});

it("gives a new account the salesperson's CRM user, or lists the salesperson for Needs owner", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1), company(2, { user_id: [10, "Unknown Rep"] })], accounts);
  await runSync(ctx, client, now);
  expect(accounts.find((a) => a.name === "Co 1")?.assigned_to).toBe("u-rep");
  const second = accounts.find((a) => a.name === "Co 2")!;
  expect(second.assigned_to).toBeNull();
  expect((await ctx.store.get<AccountLink>(K.account(second.id as string)))?.salesperson).toBe("Unknown Rep");
});

it("records a conflict and touches neither account (Review Focus 2)", async () => {
  const accounts: RecordData[] = [
    { id: "a1", name: "A", company_id: "27082440", deletedAt: null },
    { id: "a2", name: "B", company_id: "27082440", deletedAt: null },
  ];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" })], accounts);
  expect(await runSync(ctx, client, now)).toMatchObject({ conflicts: 1, created: 0, updated: 0 });
  expect((await ctx.store.get<Conflict>(K.conflict(1)))?.candidates).toEqual(["a1", "a2"]);
  expect(accounts.map((a) => a.name)).toEqual(["A", "B"]);
});

it("is idempotent and restores Odoo's value over a CRM edit (Review Focus 1, 3)", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1, { company_registry: "27082440" })];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(accounts).toHaveLength(1);
  accounts[0].name = "Edited in CRM";
  partners[0].write_date = "2026-10-13 07:59:00";
  await runSync(ctx, client, new Date(now.getTime() + 120_000));
  expect(accounts[0].name).toBe("Co 1");
});

it("syncs incrementally from the cursor with a 2-minute overlap; marks archived and no-longer-customers", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1), company(2)];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  Object.assign(partners[0], { name: "Renamed", write_date: "2026-10-10 07:59:00" });   // inside the overlap
  Object.assign(partners[1], { active: false, write_date: "2026-10-13 07:00:00" });
  const s = await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(s).toMatchObject({ updated: 1, skipped: 1 });
  expect(accounts.some((a) => a.name === "Renamed")).toBe(true);
  const link2 = (await ctx.store.list("account:")).map((e) => e.value as AccountLink).find((l) => l.partnerId === 2);
  expect(link2).toMatchObject({ archived: true });
  expect(accounts).toHaveLength(2);   // nothing deleted
});

it("dry run writes nothing and does not move the cursor", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1)], accounts, { dryRun: true });
  expect(await runSync(ctx, client, now)).toMatchObject({ ok: true, dryRun: true, created: 1 });
  expect(accounts).toHaveLength(0);
  expect(await ctx.store.get(K.cursor)).toBeNull();
  expect(await ctx.store.list("partner:")).toEqual([]);
  expect(ctx.logs.some((l) => l.message.includes("would create account"))).toBe(true);
});

it("stops on a rejected key mid-run, keeps the cursor, and alerts admins after three failures (Review Focus 4)", async () => {
  const { ctx } = mk([]);
  const failing = { call: async () => { throw new OdooAuthError(401); }, version: async () => "x" };
  for (let i = 0; i < 4; i++) {
    const s = await runSync(ctx, failing as never, new Date(now.getTime() + i * 1000));
    expect(s).toMatchObject({ ok: false, error: "Odoo rejected the API key" });
  }
  expect(ctx.notifications.filter((n) => n.roles?.includes("admin"))).toHaveLength(1);
  expect(await ctx.store.get(K.cursor)).toBeNull();
  expect(await ctx.store.get(K.lock)).toBeNull();
});

it("skips a run while another holds the lock", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + 60_000).toISOString() });
  await runSync(ctx, client, now);
  expect(await ctx.store.get(K.lastRun)).toBeNull();
  expect(ctx.logs.some((l) => l.message.includes("another run"))).toBe(true);
});

it("scheduled sync waits for syncMinutes since the last run", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lastRun, { at: new Date(now.getTime() - 10 * 60_000).toISOString(), ok: true } as RunSummary);
  expect(await scheduledSync(ctx, now, client)).toBe(false);
  expect(await scheduledSync(ctx, new Date(now.getTime() + 5 * 60_000 - 20_000), client)).toBe(true);
});

it("re-matches when a linked account was deleted in the CRM (Review Focus 5)", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1, { company_registry: "27082440" })];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  accounts[0].deletedAt = "2026-10-13";
  partners[0].write_date = "2026-10-13 07:59:00";
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(accounts.filter((a) => a.deletedAt == null)).toHaveLength(1);
});
