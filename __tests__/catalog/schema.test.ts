import { readFileSync } from "node:fs";
import { Prisma, crm_Product_Source } from "@prisma/client";

it("generates the product source enum", () => {
  expect(Object.values(crm_Product_Source)).toEqual(["CRM", "EXTERNAL"]);
});

it("generates the source columns on products and categories", () => {
  expect(Prisma.Crm_ProductsScalarFieldEnum.source).toBe("source");
  expect(Prisma.Crm_ProductsScalarFieldEnum.externalRef).toBe("externalRef");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.source).toBe("source");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.externalRef).toBe("externalRef");
});

it("lets plugin-written rows have no creating user (Ruling 6)", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["crm_Products", "crm_ProductCategories"]) {
    const body = schema.slice(schema.indexOf(`model ${model} {`), schema.indexOf("}", schema.indexOf(`model ${model} {`)));
    expect(body).toMatch(/createdBy\s+String\?\s+@db\.Uuid/);
  }
});

it("ships a migration that is plain SQL", () => {
  const sql = readFileSync("prisma/migrations/20261014000000_catalog_external/migration.sql", "utf8");
  expect(sql.startsWith("-- CreateEnum")).toBe(true);
  expect(sql).not.toMatch(/Already up to date|Done in|npm notice/);
});
