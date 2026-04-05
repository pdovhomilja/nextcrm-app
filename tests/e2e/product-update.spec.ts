import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function selectFormOption(page: Page, fieldLabel: string, optionName: string | RegExp) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  const container = dialog.locator(".space-y-2").filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}

async function openUpdateSheetViaRowAction(page: Page) {
  await page.goto("/en/crm/products");
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });

  await firstRow.locator("button:has(.sr-only)").first().click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  await page.waitForURL(/crm\/products\//, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  await page.getByRole("button", { name: /Edit/i }).click();
  await waitForSheet(page);

  await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible({ timeout: 5000 });
}

test.describe("Product Update", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update product name via row action", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    const updatedName = `Updated Product ${Date.now()}`;
    const dialog = page.locator('[role="dialog"][data-state="open"]');

    const nameInput = dialog.locator(".space-y-2").filter({ hasText: "Name" }).locator("input");
    await nameInput.clear();
    await nameInput.fill(updatedName);

    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test("should update product price and status", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    const dialog = page.locator('[role="dialog"][data-state="open"]');

    const priceInput = dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input");
    await priceInput.clear();
    await priceInput.fill("149.99");

    await selectFormOption(page, "Status", "Active");

    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 10000 });
  });

  test("should toggle recurring and set billing period", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    const dialog = page.locator('[role="dialog"][data-state="open"]');
    const recurringCheckbox = dialog.locator("#is_recurring");

    const isChecked = await recurringCheckbox.isChecked();
    if (!isChecked) {
      await recurringCheckbox.check();
    }

    await selectFormOption(page, "Billing Period", "Quarterly");

    await dialog.locator('[type="submit"]').click();

    await assertSuccessToast(page);
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 10000 });
  });
});
