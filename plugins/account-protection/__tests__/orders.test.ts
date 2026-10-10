import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { onOrderChanged, recomputeFromOrders, register } from "../orders";
import { onUpdated } from "../hooks";
import { settingsSchema, type Ctx } from "../settings";
import { K, startRegistration } from "../store";
import { newRegistration, type Registration } from "../state";

const S = settingsSchema.parse({});
type TestCtx = Ctx & { logs: { level: string; message: string }[] };
const mk = (orders: RecordData[], accounts: RecordData[] = []) =>
  createTestContext({ pluginId: "account-protection", settings: S, data: { orders, accounts } }) as unknown as TestCtx;
const at = new Date("2026-10-01T14:00:00Z");
const reg0 = newRegistration("CZ:1", "rep1", at, S);
const order = (id: string, status: string, orderDate: string) => ({ id, accountId: "acc-1", status, orderDate });

it("extends protection from the newest qualifying order and moves the due entry", async () => {
  const ctx = mk([order("o1", "PAID", "2026-10-05"), order("o2", "CANCELLED", "2026-10-09"), order("o3", "DRAFT", "2026-10-10")]);
  await startRegistration(ctx.store, "acc-1", reg0);
  const reg = await recomputeFromOrders("acc-1", ctx);
  expect([reg?.lastOrderAt, reg?.protectedUntil, reg?.contactAt]).toEqual(["2026-10-05", "2027-10-05T00:00:00.000Z", "2026-10-05T00:00:00.000Z"]);
  expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual(["due:2027-10-05:acc-1"]);
  expect(ctx.logs.some((l) => l.level === "info" && l.message.includes("recomputed"))).toBe(true);
});

it("falls back when the order is cancelled, and is idempotent", async () => {
  const orders = [order("o1", "CONFIRMED", "2026-10-05")];
  const ctx = mk(orders);
  await startRegistration(ctx.store, "acc-1", reg0);
  await recomputeFromOrders("acc-1", ctx);
  orders[0].status = "CANCELLED";
  const back = await recomputeFromOrders("acc-1", ctx);
  expect([back?.protectedUntil, back?.lastOrderAt]).toEqual([reg0.protectedUntil, undefined]);
  expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual([`due:${reg0.protectedUntil.slice(0, 10)}:acc-1`]);
  const logs = ctx.logs.length;
  await recomputeFromOrders("acc-1", ctx);
  expect(ctx.logs.length).toBe(logs);
});

it("does nothing without a registration", async () => {
  const ctx = mk([order("o1", "PAID", "2026-10-05")]);
  expect(await recomputeFromOrders("acc-1", ctx)).toBeNull();
  expect(await ctx.store.list("reg:")).toEqual([]);
});

it("keeps today's behaviour and warns once when orders cannot be read (Review Focus 4)", async () => {
  const ctx = mk([]);
  (ctx.data.orders as { find: unknown }).find = async () => { throw new Error("Plugin account-protection lacks permission orders:read"); };
  await startRegistration(ctx.store, "acc-1", reg0);
  expect(await recomputeFromOrders("acc-1", ctx)).toEqual(reg0);
  await recomputeFromOrders("acc-1", ctx);
  expect(ctx.logs.filter((l) => l.level === "warn")).toHaveLength(1);
});

it("recomputes on order events with status or orderDate changes only", async () => {
  const orders = [order("o1", "CONFIRMED", "2026-10-05")];
  const ctx = mk(orders);
  await startRegistration(ctx.store, "acc-1", reg0);
  await onOrderChanged({ entity: "order", operation: "updated", recordId: "o1", changed: ["note"] }, ctx);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBeUndefined();
  await onOrderChanged({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBe("2026-10-05");
  await onOrderChanged({ entity: "order", operation: "created", recordId: "missing" }, ctx);
});

it("gives a new owner the order-based protection straight away", async () => {
  const accounts = [{ id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep2" }];
  const ctx = mk([order("o1", "PAID", "2026-09-01")], accounts);
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  await onUpdated({ entity: "account", operation: "updated", recordId: "acc-1", changed: ["assigned_to"] }, ctx, at);
  const reg = await ctx.store.get<Registration>(K.reg("acc-1"));
  expect([reg?.ownerId, reg?.lastOrderAt, reg?.protectedUntil]).toEqual(["rep2", "2026-09-01", "2027-09-01T00:00:00.000Z"]);
  expect(reg?.contactAt).toBe("2026-09-01T00:00:00.000Z");   // a recent order waives the new owner's contact deadline
});

it("register() starts and recomputes", async () => {
  const ctx = mk([order("o1", "INVOICED", "2026-10-02")]);
  await register(ctx, "acc-1", reg0);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBe("2026-10-02");
});
