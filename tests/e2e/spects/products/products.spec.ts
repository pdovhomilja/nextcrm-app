import { test } from "@playwright/test";
import { createProduct } from "../../flows/products";
import { unique } from "../../helpers/random";
import { ProductFormPage, ProductListPage } from "../../pages/products";

test.describe("Products - CRUD", () => {
  test("PEPR-001: crear producto", async ({ page }) => {
    const data = await createProduct(page, {
      name: unique("Software License E2E"),
      sku: unique("E2E-PROD"),
      unit_price: "299.99",
      currency: "USD",
      type: "PRODUCT",
    });

    const list = await ProductListPage.create(page);
    await list.expectVisible(data.name);
  });


});

test.describe("Products - Validaciones", () => {
  test("PEPR-002: rechazar name vacío", async ({ page }) => {
    await ProductListPage.from(page).open();
    const list = await ProductListPage.create(page);
    await list.clickNew();

    const form = await ProductFormPage.create(page);
    await form.fill({ name: "" });
    await form.saveExpectError();

    await form.expectError("name");
  });

  test("PEPR-003: rechazar SKU mayor a 100 caracteres", async ({ page }) => {
    await ProductListPage.from(page).open();
    const list = await ProductListPage.create(page);
    await list.clickNew();

    const form = await ProductFormPage.create(page);
    await form.fill({ name: "Test SKU", sku: "A".repeat(101), unit_price: "100" });
    await form.saveExpectError();

    await form.expectError("100");
  });

  test("PEPR-004: rechazar name mayor a 255 caracteres", async ({ page }) => {
    await ProductListPage.from(page).open();
    const list = await ProductListPage.create(page);
    await list.clickNew();

    const form = await ProductFormPage.create(page);
    await form.fill({ name: "A".repeat(256), unit_price: "100" });
    await form.saveExpectError();

    await form.expectError("255");
  });
});
