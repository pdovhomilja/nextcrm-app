import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient, OdooAuthError, OdooError } from "../odoo";
import { changedFields } from "../map";
import { runSync, scheduledSync } from "../sync";
import { settingsSchema } from "../settings";
import { K, type Conflict } from "../store";
import { company, mk, noSleep, now, odoo, person, type TestCtx } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);

it("retries a conflict once it is resolved in the CRM, with Odoo unchanged, and brings its people (review C1)", async () => {
  const accounts: RecordData[] = [
    { id: "a1", name: "A", company_id: "27082440", deletedAt: null },
    { id: "a2", name: "B", company_id: "27082440", deletedAt: null },
  ];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), person(11, 1), company(2)], accounts);
  await runSync(ctx, client, now);
  expect(await ctx.store.get(K.conflict(1))).not.toBeNull();
  accounts[1].deletedAt = "2026-10-13";
  await ctx.store.set(K.cursor, { at: "2026-10-13 07:00:00" });   // other partners moved the cursor on; partner 1 is unchanged
  await runSync(ctx, client, later(20));
  expect(await ctx.store.get(K.partner(1))).toEqual({ accountId: "a1" });
  expect(await ctx.store.get(K.conflict(1))).toBeNull();
  expect((await ctx.data.contacts.find({})).map((c) => c.accountsIDs)).toEqual(["a1"]);
});

it("retries a partner whose write failed, with Odoo unchanged (review C1)", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1)], accounts);
  const create = ctx.data.accounts.create.bind(ctx.data.accounts);
  let fail = true;
  (ctx.data.accounts as { create: unknown }).create = async (d: RecordData) => { if (fail) { fail = false; throw new Error("db down"); } return create(d); };
  expect(await runSync(ctx, client, now)).toMatchObject({ failed: 1 });
  await ctx.store.set(K.cursor, { at: "2026-10-13 07:00:00" });
  await runSync(ctx, client, later(20));
  expect(accounts).toHaveLength(1);
});

it("keeps the cursor when the people pass fails, so changed people are not skipped (review I2)", async () => {
  const partners: RecordData[] = [company(1), person(11, 1)];
  const accounts: RecordData[] = [];
  const base = odoo(partners);
  let breakPeople = false;
  const fetch = async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (breakPeople && url.endsWith("/res.partner/search_read") && JSON.stringify(body.domain).includes('"type","=","contact"')) return new Response("{}", { status: 401 });
    return base(url, init);
  };
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false }), secrets: { apiKey: "k" }, fetch, data: { accounts, contacts: [], users: [] } }) as unknown as TestCtx;
  const client = jsonClient(ctx, noSleep);
  await runSync(ctx, client, now);
  const cursor = await ctx.store.get(K.cursor);
  Object.assign(partners[0], { name: "Renamed", write_date: "2026-10-13 06:00:00" });
  Object.assign(partners[1], { function: "Owner", write_date: "2026-10-13 06:00:00" });
  breakPeople = true;
  expect(await runSync(ctx, client, later(20))).toMatchObject({ ok: false });
  expect(await ctx.store.get(K.cursor)).toEqual(cursor);
  breakPeople = false;
  await runSync(ctx, client, later(40));
  expect((await ctx.data.contacts.find({}))[0].position).toBe("Owner");
});

it("stops on a 401 on page 3, keeps what pages 1-2 did, and finishes without duplicates later (review I3, Review Focus 4)", async () => {
  const partners: RecordData[] = Array.from({ length: 250 }, (_, i) => company(i + 1));
  const accounts: RecordData[] = [];
  const base = odoo(partners);
  let pagesSeen = 0;
  let deny = true;
  const fetch = async (url: string, init?: RequestInit) => {
    if (url.endsWith("/res.partner/search_read") && deny && ++pagesSeen === 3) return new Response("{}", { status: 401 });
    return base(url, init);
  };
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false }), secrets: { apiKey: "k" }, fetch, data: { accounts, contacts: [], users: [] } }) as unknown as TestCtx;
  const client = jsonClient(ctx, noSleep);
  expect(await runSync(ctx, client, now)).toMatchObject({ ok: false, error: "Odoo rejected the API key", created: 200 });
  expect(await ctx.store.get(K.cursor)).toBeNull();
  deny = false;
  await runSync(ctx, client, later(20));
  expect(accounts).toHaveLength(250);
});

it("creates imported accounts as Active (review I4)", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1)], accounts);
  await runSync(ctx, client, now);
  expect(accounts[0].status).toBe("Active");
});

it("matches the owner's email case-insensitively (review I5)", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1)], accounts, {}, [{ id: "u-rep", email: "REP@x.example", userStatus: "ACTIVE" }]);
  await runSync(ctx, client, now);
  expect(accounts[0].assigned_to).toBe("u-rep");
});

it("treats an account already linked to another partner as a conflict (review I6)", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), company(2, { company_registry: "27082440" })], accounts);
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ created: 1, conflicts: 1 });
  expect((await ctx.store.get<Conflict>(K.conflict(2)))?.reason).toBe("linked");
});

it("never clears a filled CRM field with an empty Odoo value (Pavel)", async () => {
  expect(changedFields({ email: "a@x.example", name: "Old" }, { email: null, name: "New" })).toEqual({ name: "New" });
  const accounts: RecordData[] = [{ id: "a1", name: "Co", company_id: "27082440", email: "crm@x.example", office_phone: "123", deletedAt: null }];
  const { ctx, client } = mk([company(1, { company_registry: "27082440", name: "Co" })], accounts);
  await runSync(ctx, client, now);
  expect(accounts[0]).toMatchObject({ email: "crm@x.example", office_phone: "123" });
});

it("reports 403 as access denied with Odoo's message, not as a bad key (review)", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db" }), secrets: { apiKey: "k" },
    fetch: async () => new Response(JSON.stringify({ message: "You are not allowed to access 'Country'" }), { status: 403 }) }) as unknown as TestCtx;
  const err = (await jsonClient(ctx, noSleep).call("res.country", "search_read").catch((e: Error) => e)) as Error;
  expect(err).toBeInstanceOf(OdooError);
  expect(err).not.toBeInstanceOf(OdooAuthError);
  expect(err.message).toBe("Odoo denied access: You are not allowed to access 'Country'");
});

it("reports a skipped run as already running, without a summary (review)", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lock, { until: later(5).toISOString() });
  expect(await runSync(ctx, client, now)).toMatchObject({ ok: false, error: "admin.running" });
  expect(await ctx.store.get(K.lastRun)).toBeNull();
  expect(await ctx.store.get(K.failures)).toBeNull();
});

it("pauses the scheduled sync in dry run and names conflicts in the dry-run log (review)", async () => {
  const { ctx, client } = mk([company(1, { company_registry: "27082440" })], [
    { id: "a1", name: "A", company_id: "27082440", deletedAt: null }, { id: "a2", name: "B", company_id: "27082440", deletedAt: null },
  ], { dryRun: true });
  expect(await scheduledSync(ctx, now, client)).toBe(false);
  await runSync(ctx, client, now);
  expect(ctx.logs.some((l) => l.message.includes("would conflict"))).toBe(true);
});

it("drops the conflict entry of a partner that is archived in Odoo (review)", async () => {
  const partners: RecordData[] = [company(1, { company_registry: "27082440" })];
  const { ctx, client } = mk(partners, [
    { id: "a1", name: "A", company_id: "27082440", deletedAt: null }, { id: "a2", name: "B", company_id: "27082440", deletedAt: null },
  ]);
  await runSync(ctx, client, now);
  Object.assign(partners[0], { active: false, write_date: "2026-10-13 07:00:00" });
  await runSync(ctx, client, later(20));
  expect(await ctx.store.get(K.conflict(1))).toBeNull();
});
