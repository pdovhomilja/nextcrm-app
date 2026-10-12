import type { Actor, AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { onCreated, onDeleted, onUpdated } from "../hooks";
import { settingsSchema, type Ctx } from "../settings";
import { K, type HistoryEntry } from "../store";
import type { Registration } from "../state";

const at = new Date("2026-10-01T14:00:00Z");
const manager: Actor = { type: "user", userId: "m1", role: "manager" };
const ctxWith = (accounts: RecordData[]) =>
  createTestContext({ pluginId: "account-protection", settings: settingsSchema.parse({}), data: { accounts } }) as unknown as Ctx;
const ev = (operation: AfterInput["operation"], recordId: string, extra: Partial<AfterInput> = {}): AfterInput =>
  ({ entity: "account", operation, recordId, actor: manager, ...extra });
const history = async (ctx: Ctx, id: string) => (await ctx.store.list(`hist:${id}:`)).map((e) => e.value as HistoryEntry);

it("indexes the number and starts a registration on create", async () => {
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", key: "CZ:27082440" });
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toEqual({});
  expect(await history(ctx, "acc-1")).toEqual([expect.objectContaining({ from: null, to: "rep1", reason: "created", byUserId: "m1", byType: "user" })]);
});

it("records a conflict instead of stealing a number (race)", async () => {
  const ctx = ctxWith([{ id: "acc-2", company_id: "27082440", assigned_to: "rep2" }]);
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await onCreated(ev("created", "acc-2"), ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get(K.conflict("acc-2"))).toMatchObject({ key: "CZ:27082440", otherAccountId: "acc-1" });
  expect(await ctx.store.get(K.reg("acc-2"))).toBeNull();
});

it("records owner changes, restarts protection and treats '' as no owner (Review Focus 3)", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  acc.assigned_to = "rep2";
  await onUpdated(ev("updated", "acc-1", { changed: ["assigned_to"] }), ctx, new Date("2026-10-10T10:00:00Z"));
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep2", registeredAt: "2026-10-10T10:00:00.000Z" });
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
  acc.assigned_to = "";
  await onUpdated(ev("updated", "acc-1", { changed: ["assigned_to"] }), ctx, new Date("2026-10-11T10:00:00Z"));
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect((await history(ctx, "acc-1")).map((h) => [h.from, h.to, h.reason])).toEqual([
    [null, "rep1", "created"], ["rep1", "rep2", "assigned"], ["rep2", null, "released"],
  ]);
});

it("ignores a repeated event (Review Focus 5)", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-1"), ctx, new Date("2026-10-01T14:05:00Z"));
  acc.assigned_to = "rep2";
  const e = ev("updated", "acc-1", { changed: ["assigned_to"] });
  await onUpdated(e, ctx, new Date("2026-10-10T10:00:00Z"));
  await onUpdated(e, ctx, new Date("2026-10-10T10:01:00Z"));
  expect(await history(ctx, "acc-1")).toHaveLength(2);
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ registeredAt: "2026-10-10T10:00:00.000Z" });
});

it("records owner history for accounts without a number, without a registration", async () => {
  const acc = { id: "acc-9", company_id: null, assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-9"), ctx, at);
  expect(await ctx.store.get(K.reg("acc-9"))).toBeNull();
  expect(await history(ctx, "acc-9")).toHaveLength(1);
});

it("moves the number index and the registration on a number change", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  acc.company_id = "12345678";
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, new Date("2026-10-05T00:00:00Z"));
  expect(await ctx.store.get(K.num("CZ:27082440"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:12345678"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ key: "CZ:12345678", registeredAt: "2026-10-01T14:00:00.000Z" });
});

it("does not restart protection when a rep edits the number away and back (review I2)", async () => {
  const acc = { id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  acc.billing_country = "Germany";
  await onUpdated(ev("updated", "acc-1", { changed: ["billing_country"] }), ctx, new Date("2026-10-25T00:00:00Z"));
  acc.billing_country = "CZ";
  await onUpdated(ev("updated", "acc-1", { changed: ["billing_country"] }), ctx, new Date("2026-10-25T00:01:00Z"));
  (acc as { company_id: string }).company_id = "";
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, new Date("2026-10-25T00:02:00Z"));
  acc.company_id = "27082440";
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, new Date("2026-10-25T00:03:00Z"));
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ key: "CZ:27082440", registeredAt: "2026-10-01T14:00:00.000Z", contactDeadline: "2026-10-31T14:00:00.000Z" });
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toEqual({});
});

it("frees the number and the registration on delete, keeping history", async () => {
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", assigned_to: "rep1" }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onDeleted(ev("deleted", "acc-1"), ctx);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toBeNull();
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
  expect(await history(ctx, "acc-1")).toHaveLength(1);
});

it("re-indexes a restored account and flags a number taken while it was deleted (review I3)", async () => {
  const acc: Record<string, unknown> = { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null };
  const other = { id: "acc-2", company_id: "11111111", assigned_to: "rep2", deletedAt: null };
  const ctx = ctxWith([acc, other]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  acc.deletedAt = "2026-10-02T00:00:00Z";
  await onDeleted(ev("deleted", "acc-1"), ctx);
  acc.deletedAt = null;
  await onUpdated(ev("updated", "acc-1", { changed: ["deletedAt", "deletedBy"] }), ctx, new Date("2026-10-05T00:00:00Z"));
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", registeredAt: "2026-10-05T00:00:00.000Z" });

  acc.deletedAt = "2026-10-06T00:00:00Z";
  await onDeleted(ev("deleted", "acc-1"), ctx);
  other.company_id = "27082440";
  await onUpdated(ev("updated", "acc-2", { changed: ["company_id"] }), ctx, new Date("2026-10-07T00:00:00Z"));
  acc.deletedAt = null;
  await onUpdated(ev("updated", "acc-1", { changed: ["deletedAt", "deletedBy"] }), ctx, new Date("2026-10-08T00:00:00Z"));
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-2" });
  expect(await ctx.store.get(K.conflict("acc-1"))).toMatchObject({ otherAccountId: "acc-2" });
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
});

it("rebuilds a missing registration when a partly failed event is retried (review I5)", async () => {
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", assigned_to: "rep1" }]);
  // First attempt wrote the index and history, then failed before the registration.
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  await ctx.store.set(K.hist("acc-1", at.toISOString()), { at: at.toISOString(), from: null, to: "rep1", byUserId: "m1", byType: "user", reason: "created" });
  await onCreated(ev("created", "acc-1"), ctx, new Date("2026-10-01T14:03:00Z"));
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", registeredAt: at.toISOString() });
  expect(await history(ctx, "acc-1")).toHaveLength(1);
});

it("hands the number to the duplicate when the holder is deleted (review I7)", async () => {
  const ctx = ctxWith([
    { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null },
    { id: "acc-2", company_id: "27082440", assigned_to: "rep2", deletedAt: null },
  ]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  expect(await ctx.store.get(K.conflict("acc-2"))).toMatchObject({ otherAccountId: "acc-1" });
  await onDeleted(ev("deleted", "acc-1"), ctx, new Date("2026-10-03T00:00:00Z"));
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-2" });
  expect(await ctx.store.get(K.conflict("acc-2"))).toBeNull();
  expect(await ctx.store.get<Registration>(K.reg("acc-2"))).toMatchObject({ ownerId: "rep2", key: "CZ:27082440" });
});

it("drops the conflict when the duplicate's number or country is corrected or cleared", async () => {
  const dup: Record<string, unknown> = { id: "acc-2", company_id: "27082440", billing_country: "CZ", assigned_to: "rep2", deletedAt: null };
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null }, dup]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  dup.company_id = "11111111";
  await onUpdated(ev("updated", "acc-2", { changed: ["company_id"] }), ctx, new Date("2026-10-02T00:00:00Z"));
  expect(await ctx.store.get(K.conflict("acc-2"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:11111111"))).toEqual({ accountId: "acc-2" });

  const dup2: Record<string, unknown> = { id: "acc-3", company_id: "27082440", billing_country: "CZ", assigned_to: null, deletedAt: null };
  const ctx2 = ctxWith([{ id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null }, dup2]);
  await onCreated(ev("created", "acc-1"), ctx2, at);
  await onCreated(ev("created", "acc-3"), ctx2, at);
  dup2.billing_country = "Germany";
  await onUpdated(ev("updated", "acc-3", { changed: ["billing_country"] }), ctx2, new Date("2026-10-02T00:00:00Z"));
  expect(await ctx2.store.get(K.conflict("acc-3"))).toBeNull();
  expect(await ctx2.store.get(K.num("DE:27082440"))).toEqual({ accountId: "acc-3" });

  dup2.billing_country = "CZ";
  await onUpdated(ev("updated", "acc-3", { changed: ["billing_country"] }), ctx2, new Date("2026-10-03T00:00:00Z"));
  expect(await ctx2.store.get(K.conflict("acc-3"))).toMatchObject({ otherAccountId: "acc-1" });
  dup2.company_id = "";
  await onUpdated(ev("updated", "acc-3", { changed: ["company_id"] }), ctx2, new Date("2026-10-04T00:00:00Z"));
  expect(await ctx2.store.get(K.conflict("acc-3"))).toBeNull();
});

it("hands the number to the duplicate when the holder's number changes", async () => {
  const holder: Record<string, unknown> = { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null };
  const ctx = ctxWith([holder, { id: "acc-2", company_id: "27082440", assigned_to: "rep2", deletedAt: null }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  holder.company_id = "11111111";
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, new Date("2026-10-02T00:00:00Z"));
  expect(await ctx.store.get(K.conflict("acc-2"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-2" });
  expect(await ctx.store.get(K.num("CZ:11111111"))).toEqual({ accountId: "acc-1" });
});

it("starts a fresh window for the duplicate's owner when it takes over a freed number", async () => {
  const holder: Record<string, unknown> = { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null };
  const dup: Record<string, unknown> = { id: "acc-2", company_id: "11111111", assigned_to: "rep2", deletedAt: null };
  const ctx = ctxWith([holder, dup]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  dup.company_id = "27082440";   // a conflict with a running window (review I2 keeps it)
  await onUpdated(ev("updated", "acc-2", { changed: ["company_id"] }), ctx, new Date("2026-10-02T00:00:00Z"));
  const freedAt = new Date("2026-12-15T09:00:00Z");
  holder.deletedAt = freedAt.toISOString();
  await onDeleted(ev("deleted", "acc-1"), ctx, freedAt);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-2" });
  expect(await ctx.store.get<Registration>(K.reg("acc-2"))).toMatchObject({ ownerId: "rep2", key: "CZ:27082440", registeredAt: freedAt.toISOString() });
  expect(await ctx.store.get(K.due("2027-01-14", "acc-2"))).toEqual({});
  expect(await ctx.store.get(K.due("2026-10-31", "acc-2"))).toBeNull();
});

it("starts a fresh window when the duplicate takes over after the holder's number changed", async () => {
  const holder: Record<string, unknown> = { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null };
  const ctx = ctxWith([holder, { id: "acc-2", company_id: "27082440", assigned_to: "rep2", deletedAt: null }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-2"), ctx, at);
  holder.company_id = "11111111";
  const movedAt = new Date("2026-12-15T09:00:00Z");
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, movedAt);
  expect(await ctx.store.get<Registration>(K.reg("acc-2"))).toMatchObject({ ownerId: "rep2", key: "CZ:27082440", registeredAt: movedAt.toISOString() });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ key: "CZ:11111111", registeredAt: at.toISOString() });
});
