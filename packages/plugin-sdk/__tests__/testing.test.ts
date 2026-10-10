import { createTestContext } from "../src/testing";

it("filters with `in` and sorts with orderBy like Prisma", async () => {
  const ctx = createTestContext({ pluginId: "p", data: { orders: [
    { id: "a", accountId: "x", status: "PAID", orderDate: "2026-01-05" },
    { id: "b", accountId: "x", status: "CANCELLED", orderDate: "2026-06-01" },
    { id: "c", accountId: "x", status: "CONFIRMED", orderDate: "2026-03-10" },
  ] } });
  const rows = await ctx.data.orders.find({ where: { accountId: "x", status: { in: ["PAID", "CONFIRMED"] } }, orderBy: { orderDate: "desc" }, take: 1 });
  expect(rows.map((r) => r.id)).toEqual(["c"]);
});
