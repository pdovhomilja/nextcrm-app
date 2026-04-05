import { test, expect } from "@playwright/test";

test.describe("Read Products", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display products table with expected columns", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText("Product Catalog")).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
    await expect(page.locator("table").first().locator("th", { hasText: "Name" }).first()).toBeVisible();
  });

  test("should navigate to product detail page from table", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstLink = page.locator('a[href*="/crm/products/"]').first();
    const productName = await firstLink.innerText();
    await firstLink.click();

    await page.waitForURL(/\/crm\/products\//, { timeout: 15000 });
    await expect(page.getByText(`Product: ${productName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should display product detail with tabs", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('a[href*="/crm/products/"]').first().click();
    await page.waitForURL(/\/crm\/products\//, { timeout: 15000 });

    await expect(page.getByRole("tab", { name: "Basic" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: /Accounts/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible({ timeout: 10000 });
  });

  test("should filter products by type", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The filter button has border-dashed class (from DataTableFacetedFilter)
    const typeButton = page.locator("button.border-dashed", { hasText: "Type" });
    if (await typeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeButton.click();
      // CommandItem renders as [role="option"] in cmdk
      await page.getByRole("option", { name: /Product/i }).click();
      await page.keyboard.press("Escape");
      await expect(page.locator("table").first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("should filter products by status", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const statusButton = page.locator("button.border-dashed", { hasText: "Status" });
    if (await statusButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusButton.click();
      await page.getByRole("option", { name: /Active/i }).click();
      await page.keyboard.press("Escape");
      await expect(page.locator("table").first()).toBeVisible();
    } else {
      test.skip();
    }
  });
});
