import { readFileSync } from "node:fs";
import { Prisma, crm_Order_Source, crm_Order_Status, NumberSeries_Reset } from "@prisma/client";

it("generates the order enums", () => {
  expect(Object.values(crm_Order_Status)).toEqual([
    "DRAFT", "PENDING_APPROVAL", "READY", "SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID", "CANCELLED", "SYNC_FAILED",
  ]);
  expect(Object.values(crm_Order_Source)).toEqual(["CRM", "EXTERNAL"]);
  expect(Object.values(NumberSeries_Reset)).toEqual(["YEARLY", "NEVER"]);
});

it("generates the order columns", () => {
  expect(Prisma.Crm_OrdersScalarFieldEnum.externalRef).toBe("externalRef");
  expect(Prisma.Crm_OrdersScalarFieldEnum.approvalRequestedAt).toBe("approvalRequestedAt");
  expect(Prisma.Crm_OrderLinesScalarFieldEnum.unitPriceOverridden).toBe("unitPriceOverridden");
  expect(Prisma.NumberSeriesScalarFieldEnum.template).toBe("template");
});

it("ships a plain-SQL migration with the default series", () => {
  const sql = readFileSync("prisma/migrations/20261012000000_orders/migration.sql", "utf8");
  expect(sql.startsWith("-- ")).toBe(true);
  expect(sql).not.toMatch(/Already up to date|Done in|npm notice/);
  expect(sql).toContain(`INSERT INTO "NumberSeries"`);
  expect(sql).toContain("ORD-{YYYY}-{####}");
});
