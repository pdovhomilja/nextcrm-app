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

async function createDisposableProduct(page: Page, name: string) {
  await page.goto("/en/crm/products");
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  await page.locator('button:has-text("+")').click();
  await waitForSheet(page);

  const dialog = page.locator('[role="dialog"][data-state="open"]');

  await dialog.locator(".space-y-2").filter({ hasText: "Name" }).locator("input").fill(name);
  await selectFormOption(page, "Type", "Product");
  await dialog.locator(".space-y-2").filter({ hasText: "Unit Price" }).locator("input").fill("1.00");
  await selectFormOption(page, "Currency", /USD/);

  await dialog.locator('[type="submit"]').click();

  await assertSuccessToast(page);
  await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 8000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 });
}

test.describe("Product Delete", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should delete a product via row action with confirmation", async ({ page }) => {
    const productName = `PW Delete Me ${Date.now()}`;
    await createDisposableProduct(page, productName);

    const productRow = page.locator("table tbody tr").filter({ hasText: productName });
    await productRow.locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: /Are you sure/i })).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();

    await assertSuccessToast(page);
    await expect(page.getByText(productName)).not.toBeVisible({ timeout: 8000 });
  });

  test("should cancel delete via confirmation dialog", async ({ page }) => {
    const productName = `PW Keep Me ${Date.now()}`;
    await createDisposableProduct(page, productName);

    const productRow = page.locator("table tbody tr").filter({ hasText: productName });
    await productRow.locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: /Are you sure/i })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { name: /Are you sure/i })).not.toBeVisible();
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 8000 });
  });
});
