import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { dueWithin, loadSummary, orderText, summaryText } from "../ui/common";
import { settingsSchema, type Ctx } from "../settings";
import { K, startRegistration } from "../store";
import { newRegistration, withOrders } from "../state";

const S = settingsSchema.parse({});
const mk = (accounts: Record<string, unknown>[], activities: Record<string, unknown>[] = []) =>
  createTestContext({ pluginId: "account-protection", settings: S, data: { accounts, activities } }) as unknown as Ctx;

it("summarizes live: contact found by the panel without waiting for the job", async () => {
  const ctx = mk([{ id: "acc-1", company_id: "27082440" }],
    [{ id: "a1", type: "visit", status: "completed", date: "2026-10-05T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }]);
  await startRegistration(ctx.store, "acc-1", newRegistration("CZ:27082440", "rep1", new Date("2026-10-01T14:00:00Z"), S));
  const { summary, contactAt } = await loadSummary(ctx, "acc-1");
  expect(contactAt).toBe("2026-10-05T09:00:00.000Z");
  expect(summary).toEqual({ kind: "protected", date: "2026-12-30T14:00:00.000Z" });
  expect(summaryText(ctx, summary)).toBe("tab.protected");
});

it("reports accounts without a number and free accounts", async () => {
  const ctx = mk([{ id: "acc-1", company_id: "" }, { id: "acc-2", company_id: "12345678" }]);
  expect((await loadSummary(ctx, "acc-1")).summary).toEqual({ kind: "noNumber" });
  expect((await loadSummary(ctx, "acc-2")).summary).toEqual({ kind: "free" });
});

it("lists registrations due within the warning window", async () => {
  const ctx = mk([]);
  await ctx.store.set(K.due("2026-11-03", "acc-1"), {});
  await ctx.store.set(K.due("2026-11-20", "acc-2"), {});
  await expect(dueWithin(ctx, new Date("2026-11-01T06:00:00Z"))).resolves.toEqual([{ accountId: "acc-1", day: "2026-11-03" }]);
});

it("shows the last confirmed order, or that there is none while rule 3 is on (Ruling 3)", () => {
  const ctx = mk([]);
  const reg = newRegistration("CZ:1", "rep1", new Date("2026-10-01T14:00:00Z"), S);
  expect(orderText(ctx, reg)).toBe("tab.noOrder");
  expect(orderText(ctx, withOrders(reg, "2026-10-05", 12))).toBe("tab.lastOrder");
  expect(orderText({ ...ctx, settings: { ...S, orderMonths: 0 } } as Ctx, reg)).toBeNull();
});
