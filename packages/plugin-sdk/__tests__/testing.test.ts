import { createTestContext } from "../src/testing";

it("provides in-memory data, store, logs and notifications", async () => {
  const ctx = createTestContext({ settings: { days: 90 }, data: { accounts: [{ id: "a1", company_id: "123" }] } });
  expect(ctx.settings).toEqual({ days: 90 });
  expect(await ctx.data.accounts.find({ where: { company_id: "123" } })).toEqual([{ id: "a1", company_id: "123" }]);
  const created = await ctx.data.accounts.create({ name: "N" });
  expect(await ctx.data.accounts.get(created.id as string)).toMatchObject({ name: "N" });
  await ctx.data.accounts.update("a1", { name: "X" });
  expect(await ctx.data.accounts.get("a1")).toMatchObject({ name: "X", company_id: "123" });
  await ctx.store.forRecord("account", "a1").set("until", "2027");
  expect(await ctx.store.forRecord("account", "a1").get("until")).toBe("2027");
  expect(await ctx.store.list()).toEqual([]);
  ctx.log.warn("w");
  await ctx.notify({ roles: ["manager"], subject: "s", text: "t" });
  expect(ctx.logs).toEqual([{ level: "warn", message: "w" }]);
  expect(ctx.notifications).toHaveLength(1);
  expect(ctx.t("a.b", { x: 1 })).toBe("a.b");
  await expect(ctx.http.fetch("https://x")).rejects.toThrow("No fetch mock configured");
});

it("filters with `in` and sorts with orderBy like Prisma", async () => {
  const ctx = createTestContext({ pluginId: "p", data: { orders: [
    { id: "a", accountId: "x", status: "PAID", orderDate: "2026-01-05" },
    { id: "b", accountId: "x", status: "CANCELLED", orderDate: "2026-06-01" },
    { id: "c", accountId: "x", status: "CONFIRMED", orderDate: "2026-03-10" },
  ] } });
  const rows = await ctx.data.orders.find({ where: { accountId: "x", status: { in: ["PAID", "CONFIRMED"] } }, orderBy: { orderDate: "desc" }, take: 1 });
  expect(rows.map((r) => r.id)).toEqual(["c"]);
});

it("lists external categories with their parent's ref", async () => {
  const ctx = createTestContext({ data: { productCategories: [] } });
  await ctx.data.productCategories.upsertExternal("1", { name: "Zásoby", parentRef: null });
  await ctx.data.productCategories.upsertExternal("2", { name: "Výrobky", parentRef: "1" });
  expect((await ctx.data.productCategories.findExternal()).map((c) => [c.ref, c.name, c.parentRef])).toEqual([["1", "Zásoby", null], ["2", "Výrobky", "1"]]);
});
