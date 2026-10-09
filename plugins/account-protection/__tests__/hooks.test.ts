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
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ key: "CZ:12345678", registeredAt: "2026-10-05T00:00:00.000Z" });
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
