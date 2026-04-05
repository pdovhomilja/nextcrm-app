import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function assertErrorToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="error"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function selectFormOption(page: Page, fieldLabel: string, optionName: string | RegExp) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  const container = dialog.locator(".space-y-2").filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}

test.describe("Product Creation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a product with required fields only", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const productName = `Test Product ${Date.now()}`;
    const dialog = page.locator('[role="dialog"][data-state="open"]');

    await dialog.locator(".space-y-2").filter({ hasText: "Name" }).locator("input").fill(productName);
    await selectFormOption(page, "Type", "Product");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("99.99");
    await selectFormOption(page, "Currency", /USD/);

    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(productName)).toBeVisible({ timeout: 10000 });
  });

  test("should create a product with all fields including recurring billing", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const productName = `Full Product ${Date.now()}`;
    const sku = `SKU-${Date.now()}`;
    const dialog = page.locator('[role="dialog"][data-state="open"]');

    await dialog.locator(".space-y-2").filter({ hasText: "Name" }).locator("input").fill(productName);
    await dialog.locator(".space-y-2").filter({ hasText: "SKU" }).locator("input").fill(sku);
    await selectFormOption(page, "Type", "Service");
    await selectFormOption(page, "Status", "Active");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("199.99");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit Cost" }).locator("input").fill("50.00");
    await selectFormOption(page, "Currency", /USD/);
    await dialog.locator(".space-y-2").filter({ hasText: "Tax Rate" }).locator("input").fill("10");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit" }).locator("input").fill("each");
    await dialog.locator("#is_recurring").check();
    await selectFormOption(page, "Billing Period", "Monthly");
    await dialog.locator(".space-y-2").filter({ hasText: "Description" }).locator("textarea").fill("A full-featured service product");

    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
  });

  test("should show validation error when name is empty", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const dialog = page.locator('[role="dialog"][data-state="open"]');

    await selectFormOption(page, "Type", "Product");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("49.99");
    await selectFormOption(page, "Currency", /USD/);

    await dialog.locator('[type="submit"]').click();

    await expect(page.locator('[role="dialog"][data-state="open"]')).toBeVisible({ timeout: 5000 });
  });

  test("should handle duplicate SKU", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const sharedSku = `DUP-SKU-${Date.now()}`;

    // Create first product
    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const dialog = page.locator('[role="dialog"][data-state="open"]');
    await dialog.locator(".space-y-2").filter({ hasText: "Name" }).locator("input").fill(`Product A ${Date.now()}`);
    await dialog.locator(".space-y-2").filter({ hasText: "SKU" }).locator("input").fill(sharedSku);
    await selectFormOption(page, "Type", "Product");
    await dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("10.00");
    await selectFormOption(page, "Currency", /USD/);
    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 10000 });

    // Create second product with same SKU
    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const dialog2 = page.locator('[role="dialog"][data-state="open"]');
    await dialog2.locator(".space-y-2").filter({ hasText: "Name" }).locator("input").fill(`Product B ${Date.now()}`);
    await dialog2.locator(".space-y-2").filter({ hasText: "SKU" }).locator("input").fill(sharedSku);
    await selectFormOption(page, "Type", "Product");
    await dialog2.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("20.00");
    await selectFormOption(page, "Currency", /USD/);
    await dialog2.locator('[type="submit"]').click();

    await assertErrorToast(page);
  });
});
