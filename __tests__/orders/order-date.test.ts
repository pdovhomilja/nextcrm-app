jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { serializeOrder } from "@/lib/orders/serialize";

it("has an orderDate column", () => {
  expect(Prisma.Crm_OrdersScalarFieldEnum.orderDate).toBe("orderDate");
});

it("ships a plain-SQL migration that backfills from createdAt", () => {
  const sql = readFileSync("prisma/migrations/20261013000000_order_date/migration.sql", "utf8");
  expect(sql.startsWith("-- ")).toBe(true);
  expect(sql).not.toMatch(/Already up to date|Done in|npm notice/);
  expect(sql).toContain(`UPDATE "crm_Orders" SET "orderDate" = "createdAt"::date`);
  expect(sql).toContain(`"crm_Orders_accountId_orderDate_idx"`);
});

it("serializes the order date as an ISO day", () => {
  const s = serializeOrder({ id: "o1", number: "N", status: "DRAFT", source: "CRM", accountId: "a", currency: "CZK", orderDate: new Date("2026-10-13T00:00:00Z"), createdAt: new Date(), updatedAt: new Date(), lines: [] });
  expect(s.orderDate).toBe("2026-10-13");
});
