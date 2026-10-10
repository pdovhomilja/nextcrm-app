import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { expire, install, sendNotices, upgrade } from "../jobs";
import { settingsSchema, type Ctx } from "../settings";
import { K, queueNotice, startRegistration, type HistoryEntry } from "../store";
import { newRegistration, type Registration } from "../state";

const S = settingsSchema.parse({});
type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string; text: string }[]; logs: { level: string; message: string }[] };
const mk = (accounts: RecordData[], activities: RecordData[] = [], users: RecordData[] = [], orders: RecordData[] = []) =>
  createTestContext({ pluginId: "account-protection", actor: { type: "plugin", pluginId: "account-protection" }, settings: S, data: { accounts, activities, users, orders } }) as unknown as TestCtx;

async function registered(ctx: Ctx, id: string, at: Date) {
  const reg = newRegistration(`CZ:${id}`, "rep1", at, S);
  await startRegistration(ctx.store, id, reg);
  await ctx.store.set(K.hist(id, at.toISOString()), { at: at.toISOString(), from: null, to: "rep1", byUserId: null, byType: "user", reason: "created" } satisfies HistoryEntry);
  return reg;
}
const reg1 = new Date("2026-10-01T14:00:00Z");

it("keeps an account on the deadline morning and expires it the next day without contact (Review Focus 4)", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
  const ctx = mk(accounts);
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-10-31T06:00:00Z"));
  expect(accounts[0].assigned_to).toBe("rep1");
  expect(ctx.notifications).toEqual([]);
  await ctx.store.set(K.lastRun, { at: "2026-11-01T05:55:00.000Z" });   // the notices job kept running
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect(await ctx.store.get(K.freed("2026-11-01", "acc-1"))).toEqual({ reason: "expired-no-contact" });
  const hist = (await ctx.store.list("hist:acc-1:")).map((e) => e.value as HistoryEntry);
  expect(hist[hist.length - 1]).toMatchObject({ from: "rep1", to: null, reason: "expired-no-contact", byType: "plugin" });
  expect(ctx.notifications).toEqual([expect.objectContaining({ roles: ["manager", "admin"], subject: "mail.expiredSubject" })]);
  expect(ctx.notifications[0].text).toContain("Alza");
});

it("keeps protection when a qualifying contact exists and moves the due day", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" }];
  const activities = [
    { id: "a1", type: "note", status: "completed", date: "2026-10-10T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a2", type: "visit", status: "completed", date: "2026-10-20T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
  ];
  const ctx = mk(accounts, activities);
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBe("rep1");
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ contactAt: "2026-10-20T09:00:00.000Z" });
  expect(await ctx.store.get(K.due("2026-12-30", "acc-1"))).toEqual({});
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
});

it("expires after the protection window even with contact", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
  const ctx = mk(accounts);
  const reg = await registered(ctx, "acc-1", reg1);
  await ctx.store.delete(K.due("2026-10-31", "acc-1"));
  await startRegistration(ctx.store, "acc-1", { ...reg, contactAt: "2026-10-05T00:00:00.000Z" });
  await expire(ctx, new Date("2026-12-31T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(await ctx.store.get(K.freed("2026-12-31", "acc-1"))).toEqual({ reason: "expired" });
});

it("sends no email on an empty run and prunes old freed entries", async () => {
  const ctx = mk([]);
  await ctx.store.set(K.freed("2026-10-01", "old"), { reason: "expired" });
  await ctx.store.set(K.freed("2026-10-28", "recent"), { reason: "expired" });
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(ctx.notifications).toEqual([]);
  expect(await ctx.store.get(K.freed("2026-10-01", "old"))).toBeNull();
  expect(await ctx.store.get(K.freed("2026-10-28", "recent"))).toEqual({ reason: "expired" });
});

it("continues past an account that fails", async () => {
  const accounts = [{ id: "acc-2", name: "B", assigned_to: "rep1" as string | null }];
  const ctx = mk(accounts);
  await registered(ctx, "acc-1", reg1);   // acc-1 is not in the data → update throws
  await registered(ctx, "acc-2", reg1);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(ctx.logs.some((l) => l.level === "error" && l.message.includes("acc-1"))).toBe(true);
});

it("sends queued notices to managers and deletes them", async () => {
  const ctx = mk([{ id: "acc-1", name: "Alza" }], [], [{ id: "rep2", name: "Rep Two" }]);
  await queueNotice(ctx.store, { kind: "blocked-protected", userId: "rep2", accountId: "acc-1" }, new Date("2026-11-01T06:00:00Z"));
  await sendNotices(ctx, new Date("2026-11-01T06:05:00Z"));
  expect(ctx.notifications).toEqual([{ roles: ["manager", "admin"], subject: "mail.blocked-protected.subject", text: "mail.blocked-protected.text" }]);
  expect(await ctx.store.list("notice:")).toEqual([]);
});

it("keeps a failing notice for retry and drops it after 24 hours", async () => {
  const ctx = mk([{ id: "acc-1", name: "Alza" }]);
  ctx.notify = async () => { throw new Error("smtp down"); };
  await queueNotice(ctx.store, { kind: "blocked-free", userId: null, accountId: "acc-1" }, new Date("2026-11-01T06:00:00Z"));
  await sendNotices(ctx, new Date("2026-11-01T07:00:00Z"));
  expect(await ctx.store.list("notice:")).toHaveLength(1);
  await sendNotices(ctx, new Date("2026-11-02T06:01:00Z"));
  expect(await ctx.store.list("notice:")).toEqual([]);
  expect(ctx.logs.some((l) => l.level === "error")).toBe(true);
});

it("backfills on install: oldest account wins a shared number, owners get registrations and history", async () => {
  const accounts = [
    { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null },
    { id: "acc-2", company_id: "270 824 40", assigned_to: "rep2", deletedAt: null },
    { id: "acc-3", company_id: null, assigned_to: "rep3", deletedAt: null },
    { id: "acc-4", company_id: "11111111", assigned_to: null, deletedAt: null },
  ];
  const ctx = mk(accounts);
  const at = new Date("2026-11-13T08:00:00Z");
  await install(ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get(K.conflict("acc-2"))).toMatchObject({ otherAccountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", registeredAt: at.toISOString() });
  expect(await ctx.store.get(K.reg("acc-2"))).toBeNull();
  expect(await ctx.store.get(K.reg("acc-3"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:11111111"))).toEqual({ accountId: "acc-4" });
  expect((await ctx.store.list("hist:")).map((e) => (e.value as HistoryEntry).reason)).toEqual(["install", "install", "install"]);
});

it("counts a visit from earlier on the registration day (review I4)", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" }];
  const activities = [{ id: "a1", type: "visit", status: "completed", date: "2026-10-01T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }];
  const ctx = mk(accounts, activities);
  await registered(ctx, "acc-1", reg1);   // registered 14:00 the same day
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBe("rep1");
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ contactAt: "2026-10-01T09:00:00.000Z" });
});

it("never counts any activity as contact when the stored contact types are all invalid", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
  const activities = [{ id: "a1", type: "note", status: "completed", date: "2026-10-10T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }];
  const ctx = mk(accounts, activities);
  (ctx as { settings: typeof S }).settings = { ...S, contactTypes: "sample" };
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
});

it("prunes conflict rows that no longer hold in the daily run", async () => {
  const accounts = [
    { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null },
    { id: "acc-2", company_id: "11111111", assigned_to: "rep2", deletedAt: null },   // number corrected while the hook missed it
    { id: "acc-3", company_id: "27082440", assigned_to: "rep3", deletedAt: null },   // still a real duplicate
  ];
  const ctx = mk(accounts);
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  const row = { key: "CZ:27082440", otherAccountId: "acc-1", foundAt: reg1.toISOString() };
  await ctx.store.set(K.conflict("acc-2"), row);
  await ctx.store.set(K.conflict("acc-3"), row);
  await ctx.store.set(K.conflict("gone"), row);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(await ctx.store.get(K.conflict("acc-2"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:11111111"))).toEqual({ accountId: "acc-2" });
  expect(await ctx.store.get(K.conflict("acc-3"))).toEqual(row);
  expect(await ctx.store.get(K.conflict("gone"))).toBeNull();
});

describe("after the plugin was disabled", () => {
  const offAt = "2026-10-02T06:00:00.000Z";
  async function disabledSetup() {
    const accounts = [
      { id: "acc-1", name: "A", assigned_to: "rep2" as string | null, deletedAt: null },   // manager changed the owner while disabled
      { id: "acc-2", name: "B", assigned_to: "rep1" as string | null, deletedAt: null },   // contact deadline passed while disabled
    ];
    const ctx = mk(accounts);
    for (const id of ["acc-1", "acc-2"]) {
      await registered(ctx, id, reg1);
      await ctx.store.set(K.num(`CZ:${id}`), { accountId: id });
      await ctx.store.set(K.acct(id), { key: `CZ:${id}` });
    }
    await ctx.store.set(K.lastRun, { at: offAt });
    return { ctx, accounts };
  }

  it("reconciles owners and restarts lapsed windows before the first expiry run", async () => {
    const { ctx, accounts } = await disabledSetup();
    const now = new Date("2026-11-15T06:00:00Z");
    await expire(ctx, now);
    expect(accounts.map((a) => a.assigned_to)).toEqual(["rep2", "rep1"]);
    expect(ctx.notifications).toEqual([]);
    const hist = (await ctx.store.list("hist:acc-1:")).map((e) => e.value as HistoryEntry);
    expect(hist[hist.length - 1]).toMatchObject({ at: now.toISOString(), from: "rep1", to: "rep2", byType: "plugin" });
    expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep2", registeredAt: now.toISOString() });
    expect(await ctx.store.get<Registration>(K.reg("acc-2"))).toMatchObject({ ownerId: "rep1", registeredAt: now.toISOString() });
    expect(await ctx.store.get(K.due("2026-10-31", "acc-2"))).toBeNull();
    expect(await ctx.store.get(K.due("2026-12-15", "acc-2"))).toEqual({});
    expect(await ctx.store.get(K.lastRun)).toEqual({ at: now.toISOString() });
  });

  it("reconciles from the five-minute notices job, so the next expiry run strips nobody", async () => {
    const { ctx, accounts } = await disabledSetup();
    await sendNotices(ctx, new Date("2026-11-15T05:10:00Z"));
    expect(await ctx.store.get<Registration>(K.reg("acc-2"))).toMatchObject({ registeredAt: "2026-11-15T05:10:00.000Z" });
    await expire(ctx, new Date("2026-11-15T06:00:00Z"));
    expect(accounts.map((a) => a.assigned_to)).toEqual(["rep2", "rep1"]);
  });

  it("does not reconcile when the jobs kept running", async () => {
    const { ctx, accounts } = await disabledSetup();
    await ctx.store.set(K.lastRun, { at: "2026-11-15T05:55:00.000Z" });
    await expire(ctx, new Date("2026-11-15T06:00:00Z"));
    expect(accounts[1].assigned_to).toBeNull();
  });
});

it("upgrade sets the run marker once and prunes stale conflicts", async () => {
  const ctx = mk([]);
  await ctx.store.set(K.conflict("gone"), { key: "CZ:27082440", otherAccountId: "acc-1", foundAt: reg1.toISOString() });
  await upgrade(ctx, new Date("2026-11-15T06:00:00Z"));
  expect(await ctx.store.get(K.lastRun)).toEqual({ at: "2026-11-15T06:00:00.000Z" });
  expect(await ctx.store.get(K.conflict("gone"))).toBeNull();
  await upgrade(ctx, new Date("2026-11-16T06:00:00Z"));
  expect(await ctx.store.get(K.lastRun)).toEqual({ at: "2026-11-15T06:00:00.000Z" });
});

describe("orders (rule 3)", () => {
  const order = (status: string, orderDate: string) => ({ id: `o-${status}`, accountId: "acc-1", status, orderDate });

  it("keeps an account past its window when a recent order exists and leaves no stale due entry (Review Focus 3)", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [{ id: "a1", type: "visit", status: "completed", date: "2026-10-05T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }], [], [order("PAID", "2026-12-01")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-12-31T05:55:00.000Z" });
    await expire(ctx, new Date("2026-12-31T06:00:00Z"));
    expect(accounts[0].assigned_to).toBe("rep1");
    expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual(["due:2027-12-01:acc-1"]);
  });

  it("treats a confirmed order after registration as the contact", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [], [], [order("CONFIRMED", "2026-10-20")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-11-01T05:55:00.000Z" });
    await expire(ctx, new Date("2026-11-01T06:00:00Z"));
    expect(accounts[0].assigned_to).toBe("rep1");
    expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.contactAt).toBe("2026-10-20T00:00:00.000Z");
  });

  it("frees the account when its only order was cancelled", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [], [], [order("CANCELLED", "2026-10-20")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-11-01T05:55:00.000Z" });
    await expire(ctx, new Date("2026-11-01T06:00:00Z"));
    expect(accounts[0].assigned_to).toBeNull();
  });

  it("upgrade sets baseUntil and order-based dates on existing registrations", async () => {
    const ctx = mk([{ id: "acc-1", assigned_to: "rep1" }], [], [], [order("DELIVERED", "2026-09-15")]);
    const { baseUntil, ...old } = newRegistration("CZ:acc-1", "rep1", reg1, S);
    await startRegistration(ctx.store, "acc-1", old as Registration);
    await upgrade(ctx, new Date("2026-10-13T08:00:00Z"));
    const reg = await ctx.store.get<Registration>(K.reg("acc-1"));
    expect([reg?.baseUntil, reg?.lastOrderAt, reg?.protectedUntil]).toEqual([baseUntil, "2026-09-15", "2027-09-15T00:00:00.000Z"]);
  });
});

it("applies a changed orderMonths to every registration in the next daily run (manual check)", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
  const orders = [{ id: "o1", accountId: "acc-1", status: "PAID", orderDate: "2026-10-05" }];
  const ctx = mk(accounts, [], [], orders);
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-10-06T06:00:00Z"));
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.protectedUntil).toBe("2027-10-05T00:00:00.000Z");
  (ctx.settings as { orderMonths: number }).orderMonths = 0;
  await ctx.store.set(K.lastRun, { at: "2026-10-07T05:55:00.000Z" });
  await expire(ctx, new Date("2026-10-07T06:00:00Z"));
  const reg = await ctx.store.get<Registration>(K.reg("acc-1"));
  expect(reg?.protectedUntil).toBe(reg?.baseUntil);
  expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual([`due:${reg?.baseUntil?.slice(0, 10)}:acc-1`]);
});
